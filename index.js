// Required modules

require('dotenv').config()

const express = require('express')
const app = express()
const port = process.env.PORT || 3000
var session = require('express-session')
const bcrypt = require('bcrypt');
const Joi = require("joi");
const url = require('url');

const ejs = require('ejs');
const { MongoClient } = require('mongodb');
const MongoStore = require('connect-mongo');
// const mongoose = require('mongoose');


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
        usertype: 'user',
        email: email,
        secret_pin: hashSecret_pin,
        firstname: firstname,
        lastname: lastname
    }

    if (!result) {
        userCollection.insertOne(user)
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
        res.render('login', { message: '', auth: req.session.authenticated, type: req.session.usertype })
    }
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
        return res.render('login', { message: "Invalid username or password", auth: req.session.authenticated, type: req.session.usertype })

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
        res.render('main',
            {
                username: req.session.username,
                auth: req.session.authenticated,
                type: req.session.usertype,
                mode: mode
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
app.get('/tasks', IsAuthenticated, (req, res) => {
    if (req.session.authenticated) {
        res.render('tasks', {
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

// Recommended Tasks Page
app.get('/recommendedTask', IsAuthenticated, (req, res) => {
    if (req.session.authenticated) {
        res.render('recommendedTask', {
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







app.get('*', (req, res) => {
    res.send('404 page not found')
})  
// Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})