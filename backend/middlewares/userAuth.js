// import jwt from 'jsonwebtoken';

// const userAuth = async (req, res, next) => {
//     const {token} = req.cookies;

//     if(!token){
//         return res.status(401).json({success:false, message:"Unauthorized"});
//     }
//     try{
//         const tokenDecode = jwt.verify(token, process.env.JWT_SECRET); 

//         if(tokenDecode.id){
//            req.user = {
//             id: decoded.id,
//             role: decoded.role,
//            };

//            next();

//         }else {
//             return res.status(401).json({success:false, message:"Unauthorized, login again"});
//         }

     
//     }
//     catch(error){
//         return res.status(401).json({success:false, message:error.message});
//     }
// }

// export default userAuth;

//old code for user login

import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const userAuth = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }

    // ✅ Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Attach user info to request
    const user = await userModel.findById(decoded.id).select("-password");//new code - archna
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    req.user = user;
    // req.user = await userModel.findById(decoded.id).select("-password");

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
  }
};

export default userAuth;

