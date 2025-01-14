import { Router } from 'express';
import { getStatus, getStats } from '../controllers/AppController';
import { postNew, getMe } from '../controllers/UsersController';
import { getConnect, getDisconnect } from '../controllers/AuthController';
import { postUpload, getShow, getIndex, putPublish, putUnpublish, getFile} from '../controllers/FilesController';

const router = Router();

// App
router.get('/status', getStatus);
router.get('/stats', getStats);
// User
router.post('/users', postNew);
router.get('/users/me', getMe);
// Auth
router.get('/connect', getConnect);
router.get('/disconnect', getDisconnect);
// Files
router.post('/files', postUpload);
router.get('/files/:id', getShow);
router.get('/files', getIndex);
router.put('/files/:id/publish', putPublish);
router.put('/files/:id/unpublish', putUnpublish);
router.get('/files/:id/data', getFile);

export default router;
