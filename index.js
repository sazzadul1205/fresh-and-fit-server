const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// Middle Ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@fnfdb.nqwaka8.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // Collections 
        const userCollection = client.db('fnfDB').collection('users');
        const galleryCollection = client.db('fnfDB').collection('gallery');
        const trainerCollection = client.db('fnfDB').collection('trainers');
        const nTrainerRequestCollection = client.db('fnfDB').collection('nTrainerRequest');
        const bookingCollection = client.db('fnfDB').collection('bookings');
        const classCollection = client.db('fnfDB').collection('classes');
        const formCollection = client.db('fnfDB').collection('forms');

        // JWT Related API verification
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        });

        // verification middle ware
        const verifyToken = (req, res, next) => {
            console.log('inside the verify Token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized Access' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized Access' })
                }
                req.decoded = decoded;
                next();
            });

        }
        // verify admin after token
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            next();
        }

        // User Related 
        // view all users
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        });
        app.get('/trainers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await trainerCollection.findOne(query)
            res.send(result)
        });
        // Add a new user
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        });
        // delete users
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        });

        // trainers Related 
        // view all trainers
        app.get('/trainers', async (req, res) => {
            const result = await trainerCollection.find().toArray();
            res.send(result)
        });
        // view a Trainer
        app.get('/trainers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await trainerCollection.findOne(query)
            res.send(result)
        });


        // Gallery Related
        // view all images with pagination
        app.get('/gallery', async (req, res) => {
            const result = await galleryCollection.find().toArray();
            res.send(result)
        });
        // new Trainer Request Relate
        app.get('/nTrainerRequest', async (req, res) => {
            const result = await nTrainerRequestCollection.find().toArray();
            res.send(result)
        });
        // add new menu item
        app.post('/nTrainerRequest', async (req, res) => {
            const request = req.body;
            const result = await nTrainerRequestCollection.insertOne(request);
            res.send(result)
        });

        // booking Related 
        // view all bookings
        app.get('/bookings', async (req, res) => {
            const result = await bookingCollection.find().toArray();
            res.send(result)
        });
        // view a booking
        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.findOne(query)
            res.send(result)
        });
        // add new booking
        app.post('/bookings', async (req, res) => {
            const request = req.body;
            const result = await bookingCollection.insertOne(request);
            res.send(result)
        });

        // classes Related 
        // view all classes
        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result)
        });
        // view a booking
        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classCollection.findOne(query)
            res.send(result)
        });
        // add new booking
        app.post('/classes', async (req, res) => {
            const request = req.body;
            const result = await classCollection.insertOne(request);
            res.send(result)
        });

        // classes Related 
        // view all classes
        app.get('/forms', async (req, res) => {
            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)
            const result = await formCollection.find()
                .skip(page * size)
                .limit(size)
                .toArray();
            res.send(result);
        });
        app.get('/formsCount', async (req, res) => {
            const count = await formCollection.estimatedDocumentCount()
            res.send({ count })
        });
        // view a booking
        app.get('/forms/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await formCollection.findOne(query)
            res.send(result)
        });
        // add new booking
        app.post('/forms', async (req, res) => {
            const request = req.body;
            const result = await formCollection.insertOne(request);
            res.send(result)
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Fresh&Fit is Running')
})
app.listen(port, () => {
    console.log(`Bistro Boss Server is Running On Port ${port}`);
})