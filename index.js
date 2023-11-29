const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// Middle Ware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://fresh-and-fit-c2dc3.web.app',
        'https://fresh-and-fit-c2dc3.firebaseapp.com'
    ],
    credentials: true
}))

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
        // await client.connect();

        // Collections 
        const userCollection = client.db('fnfDB').collection('users');
        const galleryCollection = client.db('fnfDB').collection('gallery');
        const trainerCollection = client.db('fnfDB').collection('trainers');
        const nTrainerRequestCollection = client.db('fnfDB').collection('nTrainerRequest');
        const bookingCollection = client.db('fnfDB').collection('bookings');
        const classCollection = client.db('fnfDB').collection('classes');
        const formCollection = client.db('fnfDB').collection('forms');
        const newsLetterCollection = client.db('fnfDB').collection('newsLetter');
        const payedCollection = client.db('fnfDB').collection('payed');
        const testimonialsCollection = client.db('fnfDB').collection('testimonials');
        const classesJoinedCollection = client.db('fnfDB').collection('classesJoined');

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

        // Admin Call
        app.get('/adminBalances', verifyToken, verifyAdmin, async (req, res) => {
            const trainerPayed = await payedCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPayed: { $sum: '$paymentAmount' }
                    }
                }
            ]).toArray();;
            const trainerPayedAmount = trainerPayed.length > 0 ? trainerPayed[0].totalPayed : 0;

            const balance = await bookingCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalBalance: { $sum: '$price' }
                    }
                }
            ]).toArray();;
            const FullBalance = balance.length > 0 ? balance[0].totalBalance : 0;
            res.send({
                trainerPayedAmount,
                FullBalance
            })
        });

        // User Related 
        // view all users
        app.get('/users', async (req, res) => {
            const { email } = req.query;
            if (email) {
                // If email is provided, find a specific user by email
                const query = { email };
                const result = await userCollection.findOne(query);
                res.send(result);
            } else {
                // If email is not provided, find all users
                const result = await userCollection.find().toArray();
                res.send(result);
            }
        });
        // check if the user is admin
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden Access' })
            }

            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false;
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        });
        app.post('/users', async (req, res) => {
            const request = req.body;
            const result = await userCollection.insertOne(request);
            res.send(result)
        });
        // delete users
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        });
        // Update user
        app.patch('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const updatedDoc = {
                $set: {
                    role: 'trainer'
                }
            };
            const result = await userCollection.updateOne(query, updatedDoc);
            res.send(result);
        });


        // trainers Related 
        // view all trainers
        app.get('/trainers', async (req, res) => {
            const { email } = req.query;
            if (email) {
                // If email is provided, find a specific trainer by email
                const query = { email };
                const result = await trainerCollection.findOne(query);
                res.send(result);
            } else {
                // If email is not provided, find all trainers
                const result = await trainerCollection.find().toArray();
                res.send(result);
            }
        });
        // view a Trainer
        app.get('/trainers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await trainerCollection.findOne(query)
            res.send(result)
        });
        // add new trainer item
        app.post('/trainers', verifyToken, verifyAdmin, async (req, res) => {
            const request = req.body;
            const result = await trainerCollection.insertOne(request);
            res.send(result)
        });
        // Update trainer
        app.patch('/trainers/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paymentStatus: 'paid'
                }
            }
            const result = await trainerCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })


        // Gallery Related
        // view all images with pagination
        app.get('/gallery', async (req, res) => {
            const result = await galleryCollection.find().toArray();
            res.send(result)
        });

        // Trainer Request Relate API
        // view all newTrainer Req
        app.get('/nTrainerRequest', async (req, res) => {
            const result = await nTrainerRequestCollection.find().toArray();
            res.send(result)
        });
        // view a newTrainer
        app.get('/nTrainerRequest/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await nTrainerRequestCollection.findOne(query)
            res.send(result)
        });
        // add new trainerReq item
        app.post('/nTrainerRequest', verifyToken, async (req, res) => {
            const request = req.body;
            const result = await nTrainerRequestCollection.insertOne(request);
            res.send(result)
        });
        // delete trainerReq
        app.delete('/nTrainerRequest/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await nTrainerRequestCollection.deleteOne(query)
            res.send(result)
        });

        // booking Related 
        // view all bookings
        app.get('/bookings', async (req, res) => {
            const { trainerEmail, bookerEmail } = req.query;
            // Create a query object to filter based on provided parameters
            const query = {};
            if (trainerEmail) {
                query.trainerEmail = trainerEmail;
            }
            if (bookerEmail) {
                query.bookerEmail = bookerEmail;
            }
            // Find bookings based on the constructed query
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        });
        app.get('/bookingsCount', async (req, res) => {
            const result = await bookingCollection.estimatedDocumentCount();
            res.send({ result })
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
        // delete trainerReq
        app.delete('/bookings/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        });

        // classes Related API
        // view all classes
        app.get('/classes', async (req, res) => {
            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)
            const result = await classCollection.find()
                .skip(page * size)
                .limit(size)
                .toArray();
            res.send(result)
        });
        app.get('/classesCount', async (req, res) => {
            const count = await classCollection.estimatedDocumentCount()
            res.send({ count })
        });
        // view a class
        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classCollection.findOne(query)
            res.send(result)
        });
        // add new class
        app.post('/classes', verifyToken, async (req, res) => {
            const request = req.body;
            const result = await classCollection.insertOne(request);
            res.send(result)
        });
        // Update trainer
        app.patch('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const existingClass = await classCollection.findOne(filter);
            if (!existingClass) {
                return res.status(404).json({ error: 'Class not found' });
            }
            const updatedMemberCount = existingClass.memberCount + 1;
            const updateDocument = {
                $set: {
                    memberCount: updatedMemberCount,
                },
            };
            const result = await classCollection.updateOne(filter, updateDocument);
            if (result.modifiedCount === 1) {
                res.json({ success: true, updatedMemberCount });
            } else {
                res.status(500).json({ error: 'Failed to update class member count' });
            }
        });

        // ClassesJoined Related API
        // view all classes
        app.get('/classesJoined', async (req, res) => {
            const { email } = req.query;
            if (email) {
                // If email is provided, find a specific user by email
                const query = { email };
                const result = await classesJoinedCollection.find(query).toArray();
                res.send(result);
            } else {
                // If email is not provided, find all users
                const result = await classesJoinedCollection.find().toArray();
                res.send(result);
            }
        });
        // view a class
        app.get('/classesJoined/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classesJoinedCollection.findOne(query)
            res.send(result)
        });
        // add new class
        app.post('/classesJoined', async (req, res) => {
            const request = req.body;
            const result = await classesJoinedCollection.insertOne(request);
            res.send(result)
        });

        // form Related API
        // view all forms
        app.get('/forms', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const result = await formCollection.find()
                .skip(page * size)
                .limit(size)
                .toArray();
            res.send(result);
        });
        // count of all forms
        app.get('/formsCount', async (req, res) => {
            const count = await formCollection.countDocuments();
            res.json({ count });
        });
        // view a form
        app.get('/forms/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await formCollection.findOne(query)
            res.send(result)
        });
        // add new form
        app.post('/forms', verifyToken, async (req, res) => {
            const request = req.body;
            const result = await formCollection.insertOne(request);
            res.send(result)
        });

        //newsLetter Related API
        // view all newsLetter subscribers
        app.get('/newsLetter', async (req, res) => {
            const result = await newsLetterCollection.find().toArray();
            res.send(result)
        });
        app.get('/newsLetterCount', async (req, res) => {
            const result = await newsLetterCollection.estimatedDocumentCount();
            res.send({ result })
        });
        // add new subscribers
        app.post('/newsLetter', verifyToken, async (req, res) => {
            const request = req.body;
            const result = await newsLetterCollection.insertOne(request);
            res.send(result)
        });

        //newsLetter Related API
        // view all classes
        app.get('/payed', verifyToken, verifyAdmin, async (req, res) => {
            const result = await payedCollection.find().toArray();
            res.send(result)
        });
        // add new form
        app.post('/payed', verifyToken, verifyAdmin, async (req, res) => {
            const request = req.body;
            const result = await payedCollection.insertOne(request);
            res.send(result)
        });

        //testimonials Related API
        // view all testimonials
        app.get('/testimonials', async (req, res) => {
            const result = await testimonialsCollection.find().toArray();
            res.send(result)
        });
        // add new form
        app.post('/testimonials', verifyToken, async (req, res) => {
            const request = req.body;
            const result = await testimonialsCollection.insertOne(request);
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
