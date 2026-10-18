const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { runUpload } = require('../middleware/upload');
const health = require('../controllers/healthController');
const auth = require('../controllers/authController');
const places = require('../controllers/placeController');
const catalog = require('../controllers/catalogController');
const media = require('../controllers/mediaController');
const geo = require('../controllers/geoController');

const router = express.Router();

// Health
router.get('/health', health.health);

// ---------- Auth ----------
router.post('/auth/login', auth.login);
router.get('/auth/me', authenticate, auth.me);

// ---------- Users & roles (ADMIN only) ----------
router.get('/users', authenticate, requireRole('ADMIN'), auth.listUsers);
router.post('/users', authenticate, requireRole('ADMIN'), auth.createUser);
router.put('/users/:id', authenticate, requireRole('ADMIN'), auth.updateUser);
router.put('/users/:id/password', authenticate, requireRole('ADMIN'), auth.resetPassword);
router.delete('/users/:id', authenticate, requireRole('ADMIN'), auth.deleteUser);
router.get('/roles', authenticate, requireRole('ADMIN'), auth.listRoles);
router.get('/permissions', authenticate, requireRole('ADMIN'), auth.listPermissions);
router.put('/roles/:id/permissions', authenticate, requireRole('ADMIN'), auth.setRolePermissions);

// ---------- Public: languages & categories ----------
router.get('/languages', catalog.listLanguages);
router.get('/categories', catalog.listCategories);

// ---------- Public: places discovery ----------
router.get('/places', places.list);
router.get('/places/nearby', places.nearby);
router.get('/places/:id/guide', places.publicGuide);
router.post('/places/:id/scan', places.logScan);
router.get('/places/:id', places.getOne);

// ---------- Public: mobile GPS audio guide ----------
// Geo-zone dataset and per-language narration. Public on purpose (spec rule
// 13): walking up to a stall must not require an account.
router.get('/culinary-places/nearby', geo.nearbyZones);
router.get('/culinary-places/:placeId/audio', geo.narration);

// ---------- Places admin CRUD ----------
router.post('/places', authenticate, requireRole('ADMIN', 'STAFF'), places.create);
router.put('/places/:id', authenticate, requireRole('ADMIN', 'STAFF'), places.update);
router.patch('/places/:id/status', authenticate, requireRole('ADMIN', 'STAFF'), places.setStatus);
router.delete('/places/:id', authenticate, requireRole('ADMIN'), places.remove);

// Place translations (admin)
router.get('/places/:id/translations', authenticate, requireRole('ADMIN', 'STAFF'), places.listTranslations);
router.post('/places/:id/translations', authenticate, requireRole('ADMIN', 'STAFF'), places.upsertTranslation);
router.put('/translations/:translationId', authenticate, requireRole('ADMIN', 'STAFF'), places.upsertTranslation);
router.delete('/translations/:translationId', authenticate, requireRole('ADMIN', 'STAFF'), places.deleteTranslation);

// Place images (admin)
router.post('/places/:id/images', authenticate, requireRole('ADMIN', 'STAFF'), runUpload('image'), places.addImage);
router.put('/places/:id/images/:imageId', authenticate, requireRole('ADMIN', 'STAFF'), places.updateImage);
router.delete('/places/:id/images/:imageId', authenticate, requireRole('ADMIN', 'STAFF'), places.deleteImage);

// ---------- Languages admin ----------
router.post('/languages', authenticate, requireRole('ADMIN'), catalog.createLanguage);
router.put('/languages/:id', authenticate, requireRole('ADMIN'), catalog.updateLanguage);
router.delete('/languages/:id', authenticate, requireRole('ADMIN'), catalog.deleteLanguage);

// ---------- Categories admin ----------
router.post('/categories', authenticate, requireRole('ADMIN', 'STAFF'), catalog.createCategory);
router.put('/categories/:id', authenticate, requireRole('ADMIN', 'STAFF'), catalog.updateCategory);
router.delete('/categories/:id', authenticate, requireRole('ADMIN'), catalog.deleteCategory);

// ---------- Dishes ----------
router.get('/dishes', catalog.listDishes);
router.get('/dishes/:id', catalog.getDish);
router.post('/dishes', authenticate, requireRole('ADMIN', 'STAFF'), catalog.createDish);
router.put('/dishes/:id', authenticate, requireRole('ADMIN', 'STAFF'), catalog.updateDish);
router.post('/dishes/:id/image', authenticate, requireRole('ADMIN', 'STAFF'), runUpload('image'), catalog.uploadDishImage);
router.delete('/dishes/:id', authenticate, requireRole('ADMIN', 'STAFF'), catalog.deleteDish);
router.post('/dishes/:id/translations', authenticate, requireRole('ADMIN', 'STAFF'), catalog.upsertDishTranslation);

// ---------- Culinary routes ----------
router.get('/routes', catalog.listRoutes);
router.get('/routes/:id', catalog.getRoute);
router.post('/routes', authenticate, requireRole('ADMIN', 'STAFF'), catalog.createRoute);
router.put('/routes/:id', authenticate, requireRole('ADMIN', 'STAFF'), catalog.updateRoute);
router.delete('/routes/:id', authenticate, requireRole('ADMIN'), catalog.deleteRoute);
router.post('/routes/:id/stops', authenticate, requireRole('ADMIN', 'STAFF'), catalog.addStop);
router.put('/routes/stops/:stopId', authenticate, requireRole('ADMIN', 'STAFF'), catalog.updateStop);
router.delete('/routes/stops/:stopId', authenticate, requireRole('ADMIN', 'STAFF'), catalog.deleteStop);

// ---------- Audio ----------
router.get('/translations/:translationId/audio', authenticate, requireRole('ADMIN', 'STAFF'), media.getAudio);
router.post('/translations/:translationId/audio', authenticate, requireRole('ADMIN', 'STAFF'), runUpload('audio'), media.uploadAudio);
router.post('/translations/:translationId/audio/url', authenticate, requireRole('ADMIN', 'STAFF'), media.linkAudioUrl);
router.delete('/audio/:id', authenticate, requireRole('ADMIN', 'STAFF'), media.deleteAudio);
router.post('/tts', authenticate, requireRole('ADMIN', 'STAFF'), media.ttsGenerate);

// ---------- QR ----------
router.get('/places/:id/qr', media.getQR);
router.post('/places/:id/qr', authenticate, requireRole('ADMIN', 'STAFF'), media.createQR);
router.post('/places/:id/qr/regenerate', authenticate, requireRole('ADMIN', 'STAFF'), media.regenerateQR);

// ---------- Statistics ----------
router.get('/dashboard/statistics', authenticate, requireRole('ADMIN', 'STAFF'), media.dashboardStats);
router.get('/statistics/scans', authenticate, requireRole('ADMIN', 'STAFF'), media.scansStats);
router.get('/statistics/audio', authenticate, requireRole('ADMIN', 'STAFF'), media.audioStats);

// ---------- Visitor favorites / history (anonymous session) ----------
router.get('/favorites', media.listFavorites);
router.post('/favorites', media.addFavorite);
router.delete('/favorites', media.removeFavorite);
router.get('/history', media.listHistory);
router.post('/history', media.logHistory);

module.exports = router;
