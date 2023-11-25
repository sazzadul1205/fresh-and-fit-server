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

        // User Related 
        // view all users
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
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