// Required modules

require('dotenv').config()

const path = require('path');


const express = require('express')
const app = express()
const port = process.env.PORT || 3000
var session = require('express-session')
const bcrypt = require('bcrypt');
const Joi = require("joi");
const bodyParser = require('body-parser');
const url = require('url');

// const ObjectId = require('mongodb').ObjectId; //for querying an array of document ID's
const { MongoClient, ObjectId } = require('mongodb');
const ejs = require('ejs');
const MongoStore = require('connect-mongo');
const { get } = require('http')
const { error } = require('console');
// const { isObjectIdOrHexString } = require('mongoose');
const mongoose = require('mongoose');


// global variables and secret keys
const saltRounds = 10;
const expirytime = 1 * 60 * 60 * 1000// (milliseconds * sec * min) 1 hour

const mongodb_user = process.env.MONGODB_USER
const mongodb_password = process.env.MONGODB_PASSWORD
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET
const mongodb_host = process.env.MONGODB_HOST
const node_session_secret = process.env.NODE_SESSION_SECRET
const mongodb_database = process.env.MONGODB_DATABASE

// MongoDB connection

const atlasurl = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true&w=majority`;
const database = new MongoClient(atlasurl);
const userCollection = database.db(mongodb_database).collection('users');
const tasksCollection = database.db(mongodb_database).collection('tasks');
const jobsCollection = database.db(mongodb_database).collection('jobs');

const goferCollection = database.db(mongodb_database).collection('gofers');



// Session store
var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
})


// Middleware

app.use(session({
    secret: node_session_secret,
    resave: true,
    saveUninitialized: false,
    store: mongoStore,
    cookie: {
        maxAge: expirytime
    }
}))

app.use(express.urlencoded({ extended: true }))
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/css"));
app.use(express.static(__dirname + "/frontend_js"));
app.set('view engine', 'ejs');

app.use('/', (req, res, next) => {
    app.locals.auth = req.session.authenticated
    app.locals.type = req.session.usertype
    app.locals.username = req.session.username

    next()

})


// functions for authentication and authorization

// regular users
function IsAuthenticated(req, res, next) {
    if (req.session.authenticated) {
        return next()
    }
    else {
        res.redirect('/login')
    }
}

// gofers
function IsGofer(req, res, next) {
    if (req.session.usertype === 'gofer') {
        
        return next()
    }
    else {
        res.redirect('/login')
    }
}

// admins
function IsAdmin(req, res, next) {
    if (req.session.usertype === 'admin') {
        return next()
    }
    else {
        res.redirect('/login')
    }
}


// Routes


// landing page
app.get('/', (req, res) => {
    res.render('index', { auth: req.session.authenticated, type: req.session.usertype })

})

// about page and easter egg
app.get('/about', (req, res) => {
    res.render('about', { auth: req.session.authenticated, type: req.session.usertype })
})
// about page and easter egg
app.get('/about', (req, res) => {
    res.render('about', { auth: req.session.authenticated, type: req.session.usertype })
})


// signup
app.get('/signup', (req, res) => {
    res.render('signup', { message: '', auth: req.session.authenticated, type: req.session.usertype })
    
})

app.post('/signup-handler', async (req, res) => {

    var email = req.body.email

    var email = req.body.email
    var secret_pin = req.body.secret_pin
    var username = req.body.username
    var password = req.body.password
    var firstname = req.body.firstname
    var lastname = req.body.lastname




    const schema = Joi.object(
        {
            username: Joi.string().min(3).max(20).required(),
            email: Joi.string().min(3).max(30).required(),
            secret_pin: Joi.number().min(4).required(),
            password: Joi.string().min(4).max(20).required(),
            firstname: Joi.string().max(20).required(),
            lastname: Joi.string().max(20).required()
        })

    const validation = schema.validate(req.body)

    if (validation.error) {
        var error = validation.error.details
        console.log(error)
        res.render('/signup', { auth: req.session.authenticated, type: req.session.usertype, message: error[0].message })
  
        return
    }

    result = await userCollection.findOne({
        username: username
    })

    const hashPassword = await bcrypt.hash(password, saltRounds)
    const hashSecret_pin = await bcrypt.hash(secret_pin, saltRounds)

   
    const user = {
        username: username,
        password: hashPassword,
        
        email: email,
        secret_pin: hashSecret_pin,
        firstname: firstname,
        lastname: lastname,
        usertype : usertype
    } 
    

    if (!result) {
        if (usertype == 'user') userCollection.insertOne(user)
        else {user.savedjobs = [] ; goferCollection.insertOne(user)};

        console.log(`Inserted user ${user}`);
        return res.redirect('/login')
    }

    else if (result) {
        res.render('signup', { message: 'User already exists', auth: req.session.authenticated, type: req.session.usertype })
    }

})


// login page
app.get('/login', (req, res) => {
    if (req.session.authenticated) {
        res.redirect('/main')
    }
    else {
        res.render('login', { message: '' })
    }
})

app.post('/login-handler', async (req, res) => {

    var username = req.body.username
    var password = req.body.password
    var usertype = req.body.usertype

    const schema = Joi.object(
        {
            username: Joi.string().min(3).max(20).required(),
            password: Joi.string().min(4).max(20).required(),
        })

    const validation = schema.validate({ username, password })



    if (validation.error) {
        var error = validation.error
        console.log(error)
        return res.render('login', { message: "Invalid username or password" })

    }


    result = await userCollection.findOne({ username: username })


    if (!result) {
        res.render('login', { message: 'This username does not exist', auth: req.session.authenticated, type: req.session.usertype })
 
    }

    else if (result) {
        const match = await bcrypt.compare(password, result.password)

        if (match) {
            req.session.authenticated = true
            req.session.username = result.username
            req.session.usertype = result.usertype
            req.session.cookie.maxAge = expirytime
            res.redirect(`/main?mode=${req.session.usertype}`)
        }

        else {
            res.render('login', { message: 'Incorrect password', auth: req.session.authenticated, type: req.session.usertype })
        }
    }
})


// reset password

app.get('/ResetPassword', (req, res) => {
    res.render('resetpassword', { message: '', auth: req.session.authenticated, type: req.session.usertype })
})


app.post('/reset-password-handler', async (req, res) => {

    var username = req.body.username
    var password = req.body.password
    var secret_pin = req.body.secret_pin

    const schema = Joi.object(
        {
            username: Joi.string().min(3).max(20).required(),
            password: Joi.string().min(4).max(20).required(),
            secret_pin: Joi.number().min(4).required()
        })

    const validation = schema.validate({ username, password, secret_pin })


    if (validation.error) {
        var error = validation.error.details
        console.log(error)
        return res.render('resetpassword', { message: error[0].message })
    }

    result = await userCollection.findOne({ username: username })

    if (!result) {
        res.render('resetpassword', { message: 'This username does not exist', auth: req.session.authenticated, type: req.session.usertype })
    }

    else if (result) {
        const match = await bcrypt.compare(secret_pin, result.secret_pin)

        if (match) {
            const hashPassword = await bcrypt.hash(password, saltRounds)
            userCollection.updateOne({ username: username }, { $set: { password: hashPassword } })
            res.redirect('/login')
        }
        else {
            res.render('resetpassword', { message: 'Incorrect secret pin', auth: req.session.authenticated, type: req.session.usertype })
        }
    }

})

// main page
app.get('/main', IsAuthenticated, (req, res) => {

    console.log("main page")
    let mode = req.query.mode



    if (req.session.authenticated) {
        res.render('main')
    }
    else {
        res.redirect('/login')
    }
    // console.log(req.session)
    // console.log(req.session)
})

// Urgent Tasks Page
app.get('/urgentTask', IsAuthenticated, (req, res) => {
    if (req.session.authenticated) {
        res.render('urgentTask')
    }
    else {
        res.redirect('/login')
    }
})

// Pending Tasks Page
app.get('/pendingTask', IsAuthenticated, (req, res) => {
    if (req.session.authenticated) {
        res.render('pendingTask')
    }
    else {
        res.redirect('/login')
    }
})

// Tasks Page
app.get('/tasks', IsAuthenticated, (req, res) => {
    if (req.session.authenticated) {
        res.render('tasks', {
            username: req.session.username,
            auth: req.session.authenticated,
            username: req.session.username,
            auth: req.session.authenticated,
            type: req.session.usertype
        })
    }
    else {
        res.redirect('/login')
    }
})

// Accepted Tasks Page
app.get('/acceptedTask', IsAuthenticated, (req, res) => {
    if (req.session.authenticated) {
        res.render('acceptedTask', {
            username: req.session.username,
            auth: req.session.authenticated,
            username: req.session.username,
            auth: req.session.authenticated,
            type: req.session.usertype
        })
    }
    else {
        res.redirect('/login')
    }
})

// Completed Tasks Page
app.get('/completedTask', IsAuthenticated, (req, res) => {
    if (req.session.authenticated) {
        res.render('completedTask', {
            username: req.session.username,
            auth: req.session.authenticated,
            type: req.session.usertype
        })
    }
    else {
        res.redirect('/login')
    }
})



// logout
app.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/login')
})

// Display Create Task Form


// Handle Create Task Form Submission
app.post('/createTask', IsAuthenticated, async (req, res) => {
    const { title, description, dueDate } = req.body;

    const schema = Joi.object({
        title: Joi.string().min(3).max(100).required(),
        description: Joi.string().min(3).max(1000).required(),
        dueDate: Joi.date().required()
    });

    const validation = schema.validate({ title, description, dueDate });

    if (validation.error) {
        return res.render('createTask', {
            username: req.session.username,
            auth: req.session.authenticated,
            type: req.session.usertype,
            message: validation.error.details[0].message
        });
    }

    const task = {
        title,
        description,
        dueDate,
        createdBy: req.session.username
    };

    try {
        await database.db(mongodb_database).collection('tasks').insertOne(task);
        res.redirect('/tasks');
    } catch (error) {
        console.error('Error creating task:', error);
        res.render('createTask', {
            username: req.session.username,
            auth: req.session.authenticated,
            type: req.session.usertype,
            message: 'Failed to create task. Please try again later.'
        });
    }
});

// display profile page
app.get('/profile', IsAuthenticated, async (req, res) => {
    try {
        const { username } = req.session; // username is stored in session
        const user = await userCollection.findOne({ username });
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.render('profile', { member: user});

    } catch (error) {
        console.error('Failed to fetch user:', error);
        res.status(500).send('Internal server error');
    }
});


app.get('/find', IsAuthenticated, IsGofer, async (req, res) => {
    res.render('findjobs')

})

app.get('/complete', IsAuthenticated, IsGofer, async (req, res) => {
    res.render('completedjobs')

})

app.get('/jobs', IsAuthenticated, IsGofer, async (req, res) => {
    res.render('myjobs')

})

app.get('/recommend', IsAuthenticated, async (req, res) => {
    const username = req.session.username // username is stored in session
    const user = await userCollection.findOne({ username });

    if (!user) {
        return res.status(404).redirect('/login');
    }


    async function getTasks() {
        const tasksAll = await tasksCollection.find({}).toArray();
        fiveRandomTasks = []

        for (let i = 0; i < 5; i++) {
            fiveRandomTasks.push(Math.floor(Math.random() * tasksAll.length))
            // console.log(fiveRandomTasks)
        }

        let tasks = []
        for (let i = 0; i < tasksAll.length; i++) {
            if (i === fiveRandomTasks[0] || i === fiveRandomTasks[1] || i === fiveRandomTasks[2] || i === fiveRandomTasks[3] || i === fiveRandomTasks[4]) {
                tasks.push(tasksAll[i])
            }
        }
        return tasks
    }

    await getTasks().then((tasks) => {

        // console.log(" tasks:",tasks)
        res.render('recommendTasks', { tasks: tasks });
    })

});

app.get('/AcceptTaskHandler/:selectedtask', IsAuthenticated, async (req, res) => {
    const username = req.session.username 

    const user = await userCollection.findOne({ username });
    var taskID = req.params.selectedtask
    // console.log(taskID)
    // console.log(typeof taskID)

    let objectId = new ObjectId(taskID) 
    // console.log(objectId)
    // console.log(taskID)
   


    let task = await tasksCollection.findOne({ _id: objectId })
    console.log(task)
  
    return res.render('pendingTask', { task: task })

})





app.get('/history', IsAuthenticated, async (req, res) => {
    const username = req.session.username // username is stored in session
    const user = await userCollection.findOne({ username });


    if (!user) {
        return res.status(404).redirect('/login');
    }

    const tasks = await tasksCollection.find({}).toArray();

    console.log(tasks)


    res.render('history', { tasks: tasks })

})







app.get('*', (req, res) => {
    res.send('404 page not found')
})
// Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})


