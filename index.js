
// Rewuired modules

require('dotenv').config()

const express = require('express')
const app = express()
const port = process.env.PORT || 3000
var session = require('express-session')
const bcrypt = require('bcrypt');
const ejs = require('ejs');
const Joi = require("joi");


const MongoStore = require('connect-mongo');
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
var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
})

app.use(session({
    secret: node_session_secret,
    resave: false,
    saveUninitialized: true,
    store: mongoStore,
    cookie: {
        maxAge: expirytime
    }
}))

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true&w=majority`);


}

const usersSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    type: String,


});

const userModel = mongoose.model('DTC_09_users', usersSchema)