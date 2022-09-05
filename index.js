import express, {json} from "express";
import cors from "cors";
import {MongoClient} from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';


dotenv.config();
deleteInactiveUser();

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
        console.log('-----------------', message);
        let day = dayjs().locale('pt-br');
        const invalidName = messagesSchema.validate(message).error;
        const userOnline = await db.collection('users').findOne({name: user})
        console.log(user, "aqui tem o user ", userOnline)
        if(message.type !== 'private_message' && message.type !== 'message'){
            return res.sendStatus(422)
        }
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
            from: user,
            time: day.format('HH:MM:ss')
        })
        
        return res.status(201).send('Mensagem enviada com sucesso');
    }catch(error){
        res.sendStatus(500);
    }
})

server.get('/messages', async(req,res)=>{
    try{

        const limit = (req.query.limit);
        const {user} = req.headers
        

        const usersMessages = await db.collection('messages').find().toArray();
        const lastMessages = usersMessages.slice(usersMessages.length-limit)
        const invertedLastMessages = lastMessages.reverse();
        
        
        

        const yourMessages = invertedLastMessages.map((message) => {
            
            if(message.type === 'private_message' && (message.to === user || message.from === user)){

                console.log('message ABLUBLE: ', message)
                return message;
            }
            if(message.type ==='message'){
              return message;
            }
        });
        const filterYourMessages = yourMessages.filter(mess=>(mess !== undefined));
                

        return res.status(200).send(filterYourMessages);

    } catch(error){
        res.sendStatus(500);
    }
})

server.post('/status', async(req,res)=>{
    const { user } = req.headers;
    try{

        const activeUser = await db.collection('users').findOne({name: user});
        console.log('AAAAAAAAAAAAAAAAAAA', activeUser)

        if(activeUser===null){
            return res.sendStatus(404);
        }

        const response = await db.collection('users').updateOne({lastStatus:activeUser.lastStatus},{$set:{lastStatus:Date.now()}})

        res.status(200).send('Usuário atualizado com sucesso');

    }catch(error){
        res.sendStatus(500);
    }
});

async function deleteInactiveUser(){
    
    try{
       const intervalUser = setInterval( async()=>{
   
            const verificationUsers = await db.collection('users').find().toArray();
            
            verificationUsers.forEach (async (user) => {
                let day = dayjs().locale('pt-br');
                if((Date.now() - user.lastStatus) > 10000){
                 
                  await db.collection('users').deleteOne(user);
                  await db.collection('messages').insertOne({
                    from: user.name,
                    to: 'Todos',
                    text: 'sai da sala...',
                    type: 'status',
                    time:  day.format('HH:MM:ss')
                      
                  }) 
                }
            });
        },15000)

    }catch(error){
        console.error(error);
    }
}







const port = process.env.PORT || 5000;

server.listen(port,()=>{
    console.log(`Server running on port ${port}`);
})
