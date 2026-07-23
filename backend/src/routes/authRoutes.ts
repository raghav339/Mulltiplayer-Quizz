import express from "express";
import prisma from "../prisma.js"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router=express.Router();

router.post("/signup",async (req,res)=>{
    try{
        const username=req.body.username;
        const password=req.body.password;

        if(!username || !password)
        {
            return res.status(400).json({
                message:"ERROR! Input Field Empty"
            })
        }
        
        const hash=await bcrypt.hash(password,10);

        const user=await prisma.users.create({
            data:{
                username,
                password:hash
            }
        })

        console.log(user);

        res.status(200).json({
            message:"SAVED"
        })
    }
    catch(err){
        res.status(500).json({
            message:"INTERNAL ERROR"
        })
    }
});

router.post("/signin",async (req,res)=>{
    try{
        const username=req.body.username;
        const password=req.body.password;

        if(!username || !password)
        {
            return res.status(400).json({
                message:"ERROR! Input Field Empty"
            })
        }

        const user=await prisma.users.findUnique({
            where:{
                username
            }
        })

        if(!user)
        {
            return res.status(400).json({
                message:"Wrong Credentials"
            })
        }

        const valid=await bcrypt.compare(password,user.password);

        if(!valid)
        {
            return res.status(400).json({
                message:"Wrong Credentials"
            })
        }

        const token=jwt.sign({
            username
        },process.env.SECRET_KEY!);

        res.status(200).json({
            token,
            message:"SAVED"
        })
    }
    catch(err)
    {
        res.status(500).json({
            message:"INTERNAL ERROR"
        })
    }

})

export default router;