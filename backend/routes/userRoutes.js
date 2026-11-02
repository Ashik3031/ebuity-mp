import express from "express";
import { getUserData, getAllUsers, getUserById, updateBlockStatus, getUserProfile, updateUserProfile, addAddress, getAddresses, cancelOrder, updateAddress ,deleteAddress, setDefaultAddress } from "../controllers/userController.js";
import userAuth from "../middlewares/userAuth.js";

const userRouter = express.Router();

userRouter.get('/data', userAuth, getUserData);
userRouter.get('/users', getAllUsers);
userRouter.get('/users/:id', getUserById);
userRouter.post('/block', updateBlockStatus);
userRouter.get('/profile', userAuth, getUserProfile);
userRouter.put('/update-profile', userAuth, updateUserProfile);
userRouter.post('/address', userAuth, addAddress);
userRouter.get('/addresses', userAuth, getAddresses);
userRouter.put('/order/:orderId', userAuth, updateAddress);
userRouter.put('/address/default/:id', userAuth, setDefaultAddress)
userRouter.delete('/delete/:addressId', userAuth, deleteAddress);
userRouter.put('/address/:addressId', userAuth, updateAddress);
userRouter.patch('/order/:orderId', userAuth, cancelOrder);

export default userRouter;