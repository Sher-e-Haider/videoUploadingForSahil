import express from 'express';
import mongoose from 'mongoose'
import multer from 'multer';
import path from 'path'
import crypto from 'crypto'
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import {GridFsStorage} from 'multer-gridfs-storage'
import Grid from 'gridfs-stream'

dotenv.config()
const app = express()

app.use(cors())
app.use(express.json())
app.use(bodyParser.json({limit:"50mb"}))
app.use(bodyParser.urlencoded({limit:"50mb", extended: true }))



app.get('/',(req,res)=>{
    res.send("hello")
})

app.use('/uploads',express.static('uploads'))


const conn = mongoose.createConnection(process.env.MONGO_URI,{useNewUrlParser: true,  useUnifiedTopology: true});


let gfs,gridfsBucket;

conn.once('open', () => {
 
  console.log('coone');
  app.listen(process.env.PORT||5000,()=>{
           console.log("start");
        })
          gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
          bucketName: 'uploads'
      });
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});


const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
            filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });


app.post('/file', upload.single('avatar'), (req, res) => {
   res.json({ file: req.file });
  console.log(req.file.path);
});


app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

   
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'video/mp4' ||file.contentType === 'audio/mpeg'||file.contentType === 'video/MP4') {
      // Read output to browser
      const readstream = gridfsBucket.openDownloadStream(file._id);
      readstream.pipe(res);
      //res.send(req.params.filename)
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

app.get('/all',async(req,res)=>{
   try {
     
        gfs.files.find().toArray((err,files)=>{
          return res.status(200).json({files:files});
          })
         
         
       
      
     // res.send(allFiles)
   } catch (error) {
      console.log(error.message);
   }
}
)




app.get('/all/:id',async(req,res)=>{
  try {
    await gfs.files.findOne({_id:mongoose.Types.ObjectId(req.params.id)},(err,file)=>{
      // res.send(file)
       const readstream = gridfsBucket.openDownloadStream(file._id);
       console.log(file);
        readstream.pipe(res)
     })
    //  console.log(gfs.files);
     
       
    // res.send(allFiles)
  } catch (error) {
     console.log(error.message);
  }
}
)


app.get('/files/:id',async (req, res) => {
  const id = req.params.id
  //const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db);
  //console.log(bucket,'klkjjj');
 await gfs.files.find({ _id:mongoose.Types.ObjectId(id) }).toArray((error, files) => {
    if (error || files.length === 0) {
      return res.status(404).send('File not found');
    }

    const file = files[0];

    res.set('Content-Type', file.contentType);
    res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');
  
    const downloadStream = gridfsBucket.openDownloadStream(file._id);
// hh
    downloadStream.on('data', chunk => {
      res.write(chunk);
    });

    downloadStream.on('error', () => {
      res.sendStatus(404);
    });

    downloadStream.on('end', () => {
      res.end();
    });
  });
});





