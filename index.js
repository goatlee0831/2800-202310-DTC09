// Required modules

require('dotenv').config()

const express = require('express')
const app = express()
const port = process.env.PORT || 3000
var session = require('express-session')
const bcrypt = require('bcrypt');
const ejs = require('ejs');
const Joi = require("joi");

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
app.use(express.static('public'))
app.set('view engine', 'ejs');


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
    res.render('index')
})





// signup
app.get('/signup', (req, res) => {
    res.render('signup')
})

app.post('/signup', async (req, res) => {
    var email = req.body.email 
    var secret_pin = req.body.secret_pin
    var username = req.body.username
    var password = req.body.password
  


    const schema = Joi.object(
    {
        username: Joi.string().min(3).max(20).required(),
        email: Joi.string().min(3).max(20).required(),
        secret_pin: Joi.string().min(3).max(20).required(),
        password: Joi.string().min(6).max(20).required(),
    })

    const validation = schema.validate(req.body)

    if (validation.error) {
        console.log(validation.error)
        res.redirect('/signup')
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
        secret_pin: hashSecret_pin
    }

    if (!result) {
        userCollection.insertOne(user)
        return res.redirect('/login')
    }

    else if (result) {
        res.redirect('/signup', { message: 'User already exists' })
    }



})




// login page
app.get('/login', (req, res) => {
    if (req.session.authenticated) {
        res.redirect('/main')
    }
    else {
        res.render('login')
    }
})

app.post('/login', async (req, res) => {

    var username = req.body.username
    var password = req.body.password

    const schema = Joi.object(
        {
            username: Joi.string().min(3).max(20).required(),
            password: Joi.string().min(6).max(20).required(),
        })

    const validation = schema.validate(username, password)

    if (validation.error) {
        console.log(validation.error)
        res.render('/login', { message: 'something wrong with username or password' })
        return
    }

    result = await userCollection.findOne({ username: username })

    if (!result) {
        res.render('login', { message: 'This username does not exist' })
    }

    else if (result) {
        const match = await bcrypt.compare(password, result.password)

        if (match) {
            req.session.authenticated = true
            req.session.username = result.username
            req.session.usertype = result.usertype
            req.session.cookie.maxAge = expirytime
            res.redirect('/main')
        }

        else {
            res.render('login', { message: 'Incorrect password' })
        }
    }
})

app.get('/main', IsAuthenticated, (req, res) => {
    if (req.session.authenticated) {
        res.render('main', {
            username: req.session.username
        })
      
    }
    else {
        res.redirect('/login')
    }
})











// Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})