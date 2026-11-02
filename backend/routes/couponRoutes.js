import express from 'express';
import { createCoupon, getCoupon , updateCoupon, deleteCoupon,toggleCouponStatus} from '../controllers/couponController.js';
 
const router = express.Router();

//AdminRoutes
router.post('/',createCoupon);
router.get('/',getCoupon);
router.put('/:id',updateCoupon);
router.delete('/:id',deleteCoupon);
router.patch('/toggle/:id', toggleCouponStatus);

export default router;
