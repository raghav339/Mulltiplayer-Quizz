import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";



export default function authMiddleware(req:Request,res:Response,next:NextFunction)
{
    const token=req.headers.authorization;
    if(!token)
    {
        return res.status(401).json({
            message:"Please Sign In"
        });
    }

    try{
        const decoded = jwt.verify(token,process.env.SECRET_KEY!) as JwtPayload & { username: string };
        const username=decoded.username;
        if(!username)
        {
            return res.status(401).json({
                message:"Malformed Token"
            });
        }
        (req as any).username = username;
        next();
    }
    catch(err)
    {
        return res.status(401).json({
            message:"Invalid Token"
        });
    }
}