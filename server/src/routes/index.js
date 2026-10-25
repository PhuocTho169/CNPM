const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { runUpload } = require('../middleware/upload');
const media = require('../controllers/mediaController');
const placeController = require('../controllers/placeController');
const catalog = require('../controllers/catalogController');
const guest = require('../routes/guest');
const payment = require('../routes/payment');
const health = require('../controllers/healthController');
const auth = require('../controllers/authController');

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
router.get('/places', placeController.list);
router.get('/places/nearby', placeController.nearby);
router.get('/places/:id/guide', placeController.publicGuide);
router.post('/places/:id/scan', placeController.logScan);
router.get('/places/:id', placeController.getOne);

// ---------- Public: dishes ----------
router.get('/dishes', catalog.listDishes);
router.get('/dishes/:id', catalog.getDish);
router.get('/dishes/:id/translation', media.dishTranslationAccess);
router.post('/dishes', authenticate, requireRole('ADMIN', 'STAFF'), catalog.createDish);
router.put('/dishes/:id', authenticate, requireRole('ADMIN', 'STAFF'), catalog.updateDish);
router.post('/dishes/:id/image', authenticate, requireRole('ADMIN', 'STAFF'), runUpload('image'), catalog.uploadDishImage);
router.delete('/dishes/:id', authenticate, requireRole('ADMIN', 'STAFF'), catalog.deleteDish);
router.post('/dishes/:id/translations', authenticate, requireRole('ADMIN', 'STAFF'), catalog.upsertDishTranslation);

// ---------- Public: audio & translations (guests may read, paywalled) ----------
// GET /api/culinary-places/:placeId/audio?language=vi
router.get('/culinary-places/:placeId/audio', media.audioAccess);
// GET /api/dishes/:dishId/audio?language=vi
router.get('/dishes/:dishId/audio', media.audioAccess);
// GET /api/culinary-places/:placeId/translation?language=vi
router.get('/culinary-places/:placeId/translation', media.translationAccess);
// GET /api/dishes/:dishId/translation?language=vi
router.get('/dishes/:dishId/translation', media.translationAccess);

// ---------- Places admin CRUD ----------
router.post('/places', authenticate, requireRole('ADMIN', 'STAFF'), placeController.create);
router.put('/places/:id', authenticate, requireRole('ADMIN', 'STAFF'), placeController.update);
router.patch('/places/:id/status', authenticate, requireRole('ADMIN', 'STAFF'), placeController.setStatus);
router.delete('/places/:id', authenticate, requireRole('ADMIN'), placeController.remove);

// Place translations (admin)
router.get('/places/:id/translations', authenticate, requireRole('ADMIN', 'STAFF'), placeController.listTranslations);
router.post('/places/:id/translations', authenticate, requireRole('ADMIN', 'STAFF'), placeController.upsertTranslation);
router.put('/translations/:translationId', authenticate, requireRole('ADMIN', 'STAFF'), placeController.upsertTranslation);
router.delete('/translations/:translationId', authenticate, requireRole('ADMIN', 'STAFF'), placeController.deleteTranslation);

// Place images (admin)
router.post('/places/:id/images', authenticate, requireRole('ADMIN', 'STAFF'), runUpload('image'), placeController.addImage);
router.put('/places/:id/images/:imageId', authenticate, requireRole('ADMIN', 'STAFF'), placeController.updateImage);
router.delete('/places/:id/images/:imageId', authenticate, requireRole('ADMIN', 'STAFF'), placeController.deleteImage);

// ---------- Languages admin ----------
router.post('/languages', authenticate, requireRole('ADMIN'), catalog.createLanguage);
router.put('/languages/:id', authenticate, requireRole('ADMIN'), catalog.updateLanguage);
router.delete('/languages/:id', authenticate, requireRole('ADMIN'), catalog.deleteLanguage);

// ---------- Categories admin ----------
router.post('/categories', authenticate, requireRole('ADMIN', 'STAFF'), catalog.createCategory);
router.put('/categories/:id', authenticate, requireRole('ADMIN', 'STAFF'), catalog.updateCategory);
router.delete('/categories/:id', authenticate, requireRole('ADMIN'), catalog.deleteCategory);

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

// ---------- QR for dishes (admin) ----------
router.get('/dishes/:id/qr', media.getDishQR);
router.post('/dishes/:id/qr', authenticate, requireRole('ADMIN', 'STAFF'), media.createDishQR);
router.post('/dishes/:id/qr/regenerate', authenticate, requireRole('ADMIN', 'STAFF'), media.regenerateDishQR);

// ---------- Guest entitlements ----------
router.use('/guest-sessions', guest);

// ---------- Payments ----------
router.use('/payments', payment);

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
