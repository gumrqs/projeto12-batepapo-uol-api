import express, {json} from "express";
import cors from "cors";
import {MongoClient} from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';

dotenv.config();


const server = express();
server.use(cors());
server.use(json());

const mongoClient = new MongoClient(process.env.MONGO_URI)


let db;

const participantsSchema = joi.object({ 
    name: joi.string().required()
})
const messagesSchema = joi.object({
    to: joi.string().required(),
    type: joi.string().required(),
    text:joi.string().required(),
})

mongoClient.connect().then(()=>{
    db = mongoClient.db(process.env.DB_NAME);
});

server.post('/participants', async(req,res)=>{

    const user = req.body;

    try{
        let day = dayjs().locale('pt-br');
        const invalidName = participantsSchema.validate(user).error;

        if(invalidName){
        
            return res.status(422).send('Formato inválido')
        }

        const userOnline = await db.collection('users').findOne({name:user.name});

            console.log(userOnline);

            if(userOnline !== null){
                return res.status(409).send('Usuário já existente')
            }
        
        
        const response = await db.collection('users').insertOne({
            name: user.name,
            lastStatus: Date.now()
        });
        const LoginMessage = await db.collection('messages').insertOne({
            from: user.name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time:  day.format('HH:MM:ss')
        })
        const messages = await db.collection('messages').findOne({from: user.name});
        console.log(messages, "alo alo")
        res.status(201).send('Usuário registrado com sucesso');

    } catch (error){
        res.status(500).send(error.message);
    }
})

server.get('/participants', async(req,res)=>{
    try{
        const users = await db.collection('users').find().toArray();
        res.send(users);
    } catch(error){
        res.sendStatus(500);
    }
})

server.post('/messages', async (req,res)=>{

    try{
        const message = req.body
        const {user} = req.headers

        let day = dayjs().locale('pt-br');
        const invalidName = messagesSchema.validate(message).error;
        const userOnline = await db.collection('users').findOne({name: user})
        console.log(user, "aqui tem o user ", userOnline)
        if(invalidName){
            return res.status(422).send('Formato inválido')
        }
        if(userOnline === null){
            return res.status(404).send('Usuário não existente')
        }
        const messagesUser = await db.collection('messages').insertOne({
            to: message.to,
            text: message.text,
            type: message.type,
            time: day.format('HH:MM:ss')
        })
        const messages = await db.collection('messages').findOne({text: message.text});
        console.log(messages, "alo alo")
        res.status(201).send('Mensagem enviada com sucesso');
    }catch(error){
        res.sendStatus(500);
    }
})












const port = process.env.PORT || 5000;

server.listen(port,()=>{
    console.log(`Server running on port ${port}`);
})
