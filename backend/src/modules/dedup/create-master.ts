import { Apartment } from '../apartments/apartment.model.js';
import type { IParsedApartmentData } from '../ingestion/gemini.service.js';
import { GeminiVisionService } from '../ingestion/gemini-vision.service.js';
import { LeadMatchingService } from '../leads/lead-matching.service.js';
import { publishApartmentEvent } from '../realtime/realtime.bus.js';
import { GeocodingService } from '../search/geocoding.service.js';
import { geocodeStreet } from '../search/street-geocoder.js';
import { IProcessListingInput } from './dedup.types.js';
import { fetchImageBuffer } from '../../utils/fetch-image.js';
import { extractMapUrl, resolveMapCoordinates } from '../../utils/google-maps.js';
import { PHashUtil } from './phash.util.js';

/** Tải ảnh 1 lần + tính dHash (ảnh đã tải dùng lại cho Gemini Vision khi tạo căn). Ảnh lỗi bị bỏ qua. */
export async function downloadImages(mediaUrls: string[]) {
  const imageHashes: string[] = [];
  const downloadedImages: { url: string; buffer: Buffer }[] = [];
  for (const url of mediaUrls) {
    try {
      const buffer = await fetchImageBuffer(url);
      const hash = await PHashUtil.computeDHash(buffer); // ảnh hỏng sẽ lỗi ở đây và bị bỏ qua
      if (PHashUtil.isInformative(hash)) imageHashes.push(hash); // Story 14.2: ảnh trơn / banner không dùng để so trùng
      downloadedImages.push({ url, buffer });
    } catch {
      // 1 ảnh không tải được không làm hỏng cả tin
    }
  }
  return { imageHashes, downloadedImages };
}

interface NewMasterData {
  ext: IParsedApartmentData;
  mediaUrls: string[];
  imageHashes: string[];
  downloadedImages: { url: string; buffer: Buffer }[];
  review: { needsReview?: boolean; reviewReason?: string | null };
}

/** Tạo căn Master từ tin đã qua khử trùng (tách khỏi dedup.service — Story 20.1). */
export async function createMasterApartment(input: IProcessListingInput, { ext, mediaUrls, imageHashes, downloadedImages, review }: NewMasterData) {
  // Gemini Vision đánh dấu ảnh dán SĐT nguồn cũ (Story 5.2)
  const phoneImageIndexes = await GeminiVisionService.detectImagesWithPhone(downloadedImages.map((img) => img.buffer));
  // Gắn tọa độ: link Google Maps trong tin (Story 20.5, chính xác) → tên đường (Story 15.6) → điểm mốc → tâm khu vực
  const mapUrl = extractMapUrl(input.rawText);
  const fromLink = mapUrl ? await resolveMapCoordinates(mapUrl) : null;
  const fromStreet = fromLink ? null : await geocodeStreet(ext.street, ext.district);
  const geo = fromLink || fromStreet ? null : GeocodingService.resolveCoordinates(ext.address) || GeocodingService.resolveCoordinates(ext.district);

  const apartment = await Apartment.create({
    title: ext.title,
    description: input.rawText,
    price: ext.price,
    priceUsd: ext.priceUsd,
    minLeaseMonths: ext.minLeaseMonths,
    includedServices: ext.includedServices,
    location: {
      address: ext.address,
      street: ext.street,
      houseNumber: ext.houseNumber,
      buildingName: ext.buildingName,
      unitLabel: ext.unitLabel,
      zone: ext.zone,
      ward: ext.ward,
      district: ext.district,
      city: ext.city,
      mapUrl,
      coordinates: fromLink ?? fromStreet ?? geo?.coordinates,
      geoPrecision: fromLink ? 'EXACT' : fromStreet ? 'STREET' : geo ? 'AREA' : undefined,
    },
    attributes: {
      propertyType: ext.propertyType,
      area: ext.area,
      bedrooms: ext.bedrooms,
      bathrooms: ext.bathrooms,
      furnishing: ext.furnishing,
      elevator: ext.elevator,
      allowPets: ext.allowPets,
      carParking: ext.carParking,
      pcccStandard: ext.pcccStandard,
      pool: ext.pool,
      distanceToBeachM: ext.distanceToBeachM,
      motorbikeParking: ext.motorbikeParking,
      gym: ext.gym,
      bathtub: ext.bathtub,
      riverView: ext.riverView,
      seaView: ext.seaView,
      sauna: ext.sauna,
      balcony: false,
      washingMachine: 'SHARED',
    },
    fees: ext.fees,
    images: mediaUrls,
    imageHashes,
    hiddenImages: phoneImageIndexes.map((index) => downloadedImages[index].url),
    ownerContact: ext.ownerContact,
    subListings: [
      {
        sourceType: input.sourceType,
        sourceName: input.sourceName || 'Chính chủ đăng',
        sourceUrl: input.sourceUrl,
        price: ext.price,
        ownerContact: ext.ownerContact,
        images: mediaUrls,
        rawContent: input.rawText,
        postedAt: new Date(),
      },
    ],
    // Tin cần kiểm tra vẫn là "Trống" — chỉ gắn cờ cho Quản lý (trước đây bị đổi sai thành "Sắp trống")
    status: 'AVAILABLE',
    ...review,
    managerId: input.managerId,
  });

  LeadMatchingService.runInBackground(apartment); // Story 6.3: báo CTV có khách phù hợp
  publishApartmentEvent('apartment.created', apartment); // Story 11.4: CTV đang mở app thấy căn mới ngay
  return apartment;
}
