import express from "express";
import { login, logout, register, verifyOtp, sendVerifyOtp, isAuthenticated, resetPassword, ResetOtp, changePassword } from "../controllers/authController.js";
import userAuth from "../middlewares/userAuth.js";

const authRouter = express.Router();

authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.post('/logout', logout);
authRouter.post('/send-otp', userAuth, sendVerifyOtp);
authRouter.post('/verify-otp', userAuth, verifyOtp);
authRouter.get('/is-auth', userAuth, isAuthenticated);
authRouter.post('/send-reset-otp', ResetOtp);
authRouter.post('/reset-otp', ResetOtp);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/change-password', userAuth, changePassword);


export default authRouter;