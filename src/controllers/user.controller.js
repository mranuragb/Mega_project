import {asyncHandler} from "../utils/asyncHandler.js";
// import {ApiError} from "../utils/apiError.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { Jwt } from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId)=>{
    try{
       const user = await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()

       user.refreshToken = refreshToken
       await user.save({validateBeforeSave:false})

       return {accessToken , refreshToken}

    }catch(err){
        throw new ApiError(500,"Something went wrong while generating refresh and access tokens")
    }
}

const registerUser =asyncHandler(async(req,res)=>{
    // res.status(200).json({
    //     message: "ok"
    // })
    //get user details from frontend
    //validation - not empty
    //check if user already exists: username,email
    //check for images,check for avatar
    //upload them to cloudinary,avatar
    //create user object - create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return res
    

    const {fullname,email,password,username} = req.body
    console.log("email: " , email);

    // if(fullname === "")
    // {
    //     throw new ApiError(400,"Fullname is required")
    // }
    if([fullname,email,password,username].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"All field are required")
    }

    const existedUser = User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user = User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(200).json(
        new ApiResponse(200,createdUser,"User registered Successfully")
    )
})

const loginUser = asyncHandler(async (req,res)=>{
    //req body->data
    //username or email
    //find the user
    //password check
    //access and refresh token 
    //send cookies

    const {email,username,password} = req.body;

    if(!username || !email){
        throw new ApiError(400,"Username or email is required")
    }

    const user = User.findOne(
        {$or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(404,"Password does not exist")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedInUser,accessToken,
            refreshToken
        },"User logged in successfully")
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookies("accessToken",options)
    .clearCookies("refreshToken",options)
    .json(
        new ApiResponse(200,{},"User logout successfully")
    )
})

const refreshAccessToken = asyncHandler(async(req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(incomingRefreshToken)
    {
        throw new ApiError(401,"Unauthorized request")
    }

    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )
    const user = await User.findById(decodedToken?._id)

    if(!user){
        throw new ApiError(401,"Invalid refresh token")
    }

    if(!incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401,"Refresh token is expired or used")
    }

    const options = {
        httpOnly:true,
        secure:true
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiError(200,{
            accessToken,refreshToken:refreshToken},"Access token refreshed")
    )
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken

}