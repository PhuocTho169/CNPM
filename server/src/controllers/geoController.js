const geoAudioService = require('../services/geoAudioService');
const { success, ApiError } = require('../utils/errors');
const { toIntOrNull, toFloatOrNull } = require('../validators');

// Public endpoints for the mobile GPS audio guide. No `authenticate` on
// purpose: a visitor standing in front of a food stall must get narration
// without creating an account (spec rule 13).

// ---------- GET /culinary-places/nearby?latitude=&longitude=&radius= ----------
async function nearbyZones(req, res, next) {
  try {
    const latitude = toFloatOrNull(req.query.latitude);
    const longitude = toFloatOrNull(req.query.longitude);
    if (latitude === null || longitude === null) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'latitude and longitude query params are required.'
      );
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'latitude/longitude out of range.');
    }

    const places = await geoAudioService.findNearbyZones({
      latitude,
      longitude,
      radius: toIntOrNull(req.query.radius),
      limit: toIntOrNull(req.query.limit),
      lang: (req.query.lang || 'vi').toLowerCase(),
    });

    return success(res, { places });
  } catch (err) { return next(err); }
}

// ---------- GET /culinary-places/:placeId/audio?language=vi ----------
async function narration(req, res, next) {
  try {
    const placeId = toIntOrNull(req.params.placeId);
    if (!placeId) throw new ApiError(400, 'INVALID_PLACE_ID', 'Invalid place id.');

    const language = (req.query.language || req.query.lang || 'vi').toLowerCase();
    return success(res, await geoAudioService.getNarration(placeId, language));
  } catch (err) { return next(err); }
}

module.exports = { nearbyZones, narration };