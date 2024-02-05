import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";
import connectDB from "./db/index.js";
//required('dotenv').config({path:'./env'})
const app = express();
import dotenv from "dotenv"

dotenv.config({
    path:'./env'
})

// 2ND Approach
connectDB()




/*
    1St Approach 
(async ()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error",(error)=>{
            console.log("Error connecting to Mongoose server",error);
            throw error;
        })
        app.listen(process.env.PORT,()=>{
            console.log(`App listening on ${process.env.PORT}`);
        });
    }catch(e){
        console.log("Error in Mongoose",e);
    }
})*/