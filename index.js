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

// const ObjectId = require('mongodb').ObjectId; //for querying an array of document ID's
const { MongoClient, ObjectId } = require('mongodb');
const MongoStore = require('connect-mongo');
const { error } = require('console');
const { isObjectIdOrHexString } = require('mongoose');
const mongoose = require('mongoose');
const url = require('url');


// global variables and secret keys
const saltRounds = 10;
const expirytime = 24 * 60 * 60 * 1000// (milliseconds * sec * min) 1 hour

const mongodb_user = process.env.MONGODB_USER
const mongodb_password = process.env.MONGODB_PASSWORD
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET
const mongodb_host = process.env.MONGODB_HOST
const node_session_secret = process.env.NODE_SESSION_SECRET
const mongodb_database = process.env.MONGODB_DATABASE

// MongoDB connection

const atlasurl = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/project`;
const database = new MongoClient(atlasurl);
const userCollection = database.db(mongodb_database).collection('users');
const jobCollection = database.db(mongodb_database).collection('jobs');
const goferCollection = database.db(mongodb_database).collection('gofers');
const tasksCollection = database.db(mongodb_database).collection('tasks');



// Session store
var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/DTC_09_Gofer_db`,
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







app.use('/', async (req, res, next) => {
    app.locals.auth = req.session.authenticated
    app.locals.type = req.session.usertype
    app.locals.username = req.session.username
    next()
})


app.use(bodyParser.json());

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


// signup
app.get('/signup', (req, res) => {
    res.render('signup', { message: '', auth: req.session.authenticated, type: req.session.usertype })
})

app.post('/signup-handler', async (req, res) => {

    var email = req.body.email
    var secret_pin = req.body.secret_pin
    var username = req.body.username
    var password = req.body.password
    var firstname = req.body.firstname
    var lastname = req.body.lastname
    // var usertype = req.body.usertype
    // console.log(`The usertype is ${usertype}`)

    const schema = Joi.object(
        {
            username: Joi.string().min(3).max(20).required(),
            email: Joi.string().min(3).max(30).required(),
            secret_pin: Joi.number().min(4).required(),
            password: Joi.string().min(4).max(20).required(),
            firstname: Joi.string().max(20).required(),
            lastname: Joi.string().max(20).required(),
            // usertype: Joi.string().required()
        })

    const validation = schema.validate(req.body)

    if (validation.error) {
        var error = validation.error.details
        console.log(error)
        res.render('signup', { message: error[0].message })
        return
    }

    // if (usertype == 'user')
    //     result = await userCollection.findOne({
    //         username: username
    //     })
    // else result = await goferCollection.findOne({
    //     username: username
    // })

    result = await userCollection.findOne({ username: username })

    const hashPassword = await bcrypt.hash(password, saltRounds)
    const hashSecret_pin = await bcrypt.hash(secret_pin, saltRounds)


    const user = {
        username: username,
        password: hashPassword,

        email: email,
        secret_pin: hashSecret_pin,
        firstname: firstname,
        lastname: lastname,
        usertype: 'user'
    }


    if (!result) {
        // if (user.usertype == 'user') userCollection.insertOne(user)
        // else { user.savedjobs = []; goferCollection.insertOne(user) };
        userCollection.insertOne(user)

        console.log('Inserted user', user);
        return res.redirect('/login')
    }
    else if (result) {
        return res.render('signup', { message: 'User already exists' })
    }
})


// login page
app.get('/login', (req, res) => {
    (req.session.authenticated) ? (req.session.usertype) == 'gofer' ? res.redirect('/goferHome')
        : res.redirect('/main')
        : res.render('login', { message: '' })
})

app.post('/login-handler', async (req, res) => {

    var username = req.body.username
    var password = req.body.password

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

    
    let result = await userCollection.findOne({ username: username })
    let goferResult = await goferCollection.findOne({ username: username })


    if (!result && !goferResult) {
        res.render('login', { message: 'This username does not exist' });
        console.log(`login result is ${result}`);
    }



    else if (result) {
        const match = await bcrypt.compare(password, result.password)

        if (match) {
            req.session.authenticated = true
            req.session.username = result.username
            req.session.usertype = result.usertype
            req.session.cookie.maxAge = expirytime
            // req.session.usertype == 'gofer' ? res.redirect('/goferHome')
            res.redirect('/main')
        }

        else {
            res.render('login', { message: 'Incorrect password' })
        }
    }
    else if (goferResult) {
        const gofermatch = await bcrypt.compare(password, goferResult.password)

        if (gofermatch) {
            req.session.authenticated = true
            req.session.username = goferResult.username
            req.session.usertype = goferResult.usertype
            req.session.cookie.maxAge = expirytime
            res.redirect('/goferHome')
        }

        else {
            res.render('login', { message: 'Incorrect password' })
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


    if (req.session.authenticated && req.session.usertype == 'user') {
        res.render('main',
            {


            })
    }
    else {
        res.redirect('/login')
    }
    // console.log(req.session)
})

// Urgent Tasks Page
app.get('/urgentTask', IsAuthenticated, (req, res) => {
    if (req.session.authenticated) {
        res.render('urgentTask', {
            username: req.session.username,
            auth: req.session.authenticated,
            type: req.session.usertype
        })
    }
    else {
        res.redirect('/login')
    }
})

// Pending Tasks Page
app.get('/pendingTask', IsAuthenticated, (req, res) => {
    if (req.session.authenticated) {
        res.render('pendingTask', {
            username: req.session.username,
            auth: req.session.authenticated,
            type: req.session.usertype
        })
    }
    else {
        res.redirect('/login')
    }
})

// Tasks Page


// Accepted Tasks Page
app.get('/acceptedTask', IsAuthenticated, (req, res) => {
    if (req.session.authenticated) {
        res.render('acceptedTask', {
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
        return
    }
})

// Recommended Tasks Page


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
        res.render('profile', { member: user });
    } catch (error) {
        console.error('Failed to fetch user:', error);
        res.status(500).send('Internal server error');
    }
});


// --------------------------- THESE ARE THE SPECIFIC MIDDLEWARE FOR THE GOFER --------------------------------------

app.get('/goferHome', IsGofer, async (req, res) => {
    const username = req.session.username
    console.log(`${username} has logged in.`)
    const jobs = await jobCollection.find({ acceptedby: username }).toArray()

    res.render('goferDashboard.ejs', { job: jobs, savedjobs: [], firstname: username, type: 'gofer' });

})


app.get('/jobListings', IsGofer, async (req, res) => {

    let jobs = await jobCollection.find({ acceptedby: { $exists: false } }).toArray();


    let user = req.session.username

    let querysavedjobs = await goferCollection.findOne({ username: user }, { projection: { savedjobs: 1 } });
    let savedjobs = querysavedjobs.savedjobs

    res.render('jobListings', { jobs: jobs, savedjobs: savedjobs });

})


app.get('/savedJobs', IsGofer, async (req, res) => {


    let user = req.session.username
    let querysavedjobs = await goferCollection.findOne({ username: user }, { projection: { savedjobs: 1 } });

    let savedjobs = querysavedjobs.savedjobs

    const objectIds = [];
    savedjobs.forEach(stringID => {
        const objectId = mongoose.Types.ObjectId.createFromHexString(stringID);
        objectIds.push(objectId);
    });

    const query = { _id: { $in: objectIds } };

    const savedJobs = await jobCollection.find(query).toArray();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.render('savedJobs', { savedjobs: savedJobs });

})



app.post('/saveremoveacceptjob', async (req, res) => {

    let user = req.session.username
    var jobid = req.body.jobid
    if (req.body.saveJob) {
        try {
            await goferCollection.updateOne({ username: user }, { $push: { savedjobs: jobid } })
            console.log(`Saved job ID ${jobid}`)
        }
        catch (err) {
            console.log(err)
        }
    }
    if (req.body.removeJob) {
        try {
            await goferCollection.updateOne({ username: user }, { $pull: { savedjobs: jobid } })
            console.log(`removed job ID ${jobid}`)
        }
        catch (err) {
            console.log(err)
        }
    }

    if (req.body.acceptjob) {
        try {
            await goferCollection.updateOne({ username: user }, { $push: { acceptedjobs: jobid } })
            console.log(`accepted job ID ${jobid}`)
        }
        catch (err) {
            console.log(err)
        }
        try {
            await jobCollection.updateOne({ _id: new ObjectId(jobid) }, { $set: { acceptedby: user } })
            await goferCollection.updateOne({ username: user }, { $pull: { savedjobs: jobid } })
            console.log("Successfully removed from Job listings")
        }
        catch (err) {
            console.log(err)
        }
    }
    if (req.body.canceljob) {
        try {
            await jobCollection.updateOne({_id: new ObjectId(jobid) }, { $pull : {acceptedby: user} })
            await goferCollection.updateOne({ username: user }, { $pull: { acceptedjobs: jobid } })
            console.log("Successfully removed from accepted jobs")
        }
        catch (err) {
            console.log(err)
        }
    }

    res.redirect('/jobListings');
    return

})

// -----------------------------------End of gofer-specific middleware---------------------------------------------


// This is called 'setting the view directory' to allow middleware to look into folders as specified below for requested pages
app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'views/templates/'), path.join(__dirname, 'views/goferSide/')]);

// Serving static files 
app.use(express.static(__dirname + "/public"));


// Display Create Task Form
app.get('/createTask', IsAuthenticated, (req, res) => {
    res.render('createTask', {
        username: req.session.username,
        auth: req.session.authenticated,
        type: req.session.usertype,
        message: ''
    });
});

// Handle Create Task Form Submission



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


    req.session.tasks = await getTasks()


    res.render('recommendTasks', { tasks: req.session.tasks });
})



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
    // updateResult = await tasksCollection.updateOne({ _id: objectId }, { $set: { status: 'pending', username: username } })
    insertResultinJobs = await jobCollection.insertOne(task).then(() => {
        jobCollection.updateOne({ _id: objectId }, { $set: { status: 'open', username: username, acceptedby: null, id: taskID, date: "2054-05-31" } })

    })



    let postedTasksbyUser = await jobCollection.find({ username: username }).toArray()

    return res.redirect('/tasks')

})

app.get('/tasks', IsAuthenticated, async (req, res) => {

    username = req.session.username

    let postedTasksbyUser = await jobCollection.find({ username: username }).toArray()

    return res.render('tasks', { usersTasks: postedTasksbyUser })
})



app.get('/goferSignup', (req, res) => {
    res.render('become-gofer', { message: '' })
})



app.post('/gofer-handler', async (req, res) => {

    var email = req.body.email
    var secret_pin = req.body.secret_pin
    var username = req.body.username
    var password = req.body.password
    var firstname = req.body.firstname
    var lastname = req.body.lastname
    var phonenumber = req.body.phonenumber
    // var usertype = req.body.usertype
    // console.log(`The usertype is ${usertype}`)

    const schema = Joi.object(
        {
            username: Joi.string().min(3).max(20).required(),
            email: Joi.string().min(3).max(30).required(),
            secret_pin: Joi.number().min(4).required(),
            password: Joi.string().min(4).max(20).required(),
            firstname: Joi.string().max(20).required(),
            lastname: Joi.string().max(20).required(),
            phonenumber: Joi.number().min(10).required(),

        })

    const validation = schema.validate(req.body)

    if (validation.error) {
        var error = validation.error.details
        console.log(error)
        res.render('goferSignup', { message: error[0].message })
        return
    }

    result = await goferCollection.findOne({ username: username })

    const hashPassword = await bcrypt.hash(password, saltRounds)
    const hashSecret_pin = await bcrypt.hash(secret_pin, saltRounds)


    const user = {
        username: username,
        password: hashPassword,
        email: email,
        secret_pin: hashSecret_pin,
        firstname: firstname,
        lastname: lastname,
        phonenumber: phonenumber,
        usertype: 'gofer',
        acceptedjobs: [],
        savedjobs: [],
    }


    if (!result) {
        // if (user.usertype == 'user') userCollection.insertOne(user)
        // else { user.savedjobs = []; goferCollection.insertOne(user) };
        goferCollection.insertOne(user)

        console.log('Inserted gofer:', user);
        return res.render('goferSignupComplete', { message: 'You have successfully signed up as a gofer' })
    }

    else if (result) {

        return res.render('goferSignup', { message: 'User already exists' })
    }

})



// Admin Page
app.get('/admin', IsAuthenticated, async (req, res) => {
    const listOfGofers = await goferCollection.find().toArray()
    const listOfUsers = await userCollection.find().toArray()

    res.render('admin', {Gofers: listOfGofers, Users: listOfUsers})
})

// Change User Type to Admin for Gofers
app.get('/changeAdminTypeForGofers/:email', async (req, res) => {
    var email = req.params.email

    async function changeToAdmin(email) {
        var gofer = await goferCollection.findOne({ email}).then((gofer) => {
            console.log(gofer)
            gofer.usertype == 'admin'
        })
        gofer.save()
}
    changeToAdmin(email)
    res.redirect('/admin')  
})



app.get('*', (req, res) => {
    res.status(404)
    res.render('error', { message: 'Page not found' })
})

catchError = (err, res) => {
    console.log(err)
    res.status(500)
    res.render('error', { message: 'An error occurred' })
}

// Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})

