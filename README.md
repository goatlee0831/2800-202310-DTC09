# COMP2800-DTC-09
Gofer

#Project Description
Our team, DTC - 09, is developing a web app to help the lone elderly with/by providing an AI interface that automatically detects their needs and requests services on their behalf.

#Technologies used
Frontend:
HTML 5 (in EJS)
CSS 3
Vanilla JS

Backend:
Node.js
Express.js
MongoDB (Atlas)

#Listing of File Contents of folder
Main Folder:
Views (folder)
About.ejs
goferSignupComplete.ejs
recommendTasks.ejs
Admin.ejs
History.ejs
resetpassword.ejs
Become-gofer.ejs
Index.ejs
signup.ejs
createTask.ejs
Login.ejs
tasks.ejs
Error.ejs
Main.ejs
template.ejs
Findjobs.ejs
Myjobs.ejs
Templates
Footer.ejs
Header.ejs
nav_out.ejs
Footer_gofer.ejs
Header_files
Css.ejs
Icons.ejs
listing.ejs
Fonts.ejs
js_frontend_files.ejs
nav_user.ejs
Footer_out.ejs
nav.ejs
Footer_user.ejs
nav_gofer.ejs
goferSide
acceptedJobs.ejs
goferProfile.ejs
savedJobs.ejs
Completedjobs.ejs
jobListing.ejs
goferDashboard.ejs
jobListings.ejs
profile.ejs
Package-lock.json
Frontend_js (folder)
nav.js
Public (folder)
Favicon.ico
Images (folder)
Abhi.png
Gofer-ai.png
mongo.png
Alireza.png
Gofer-didit.png
node.png
Annyn.png
Gofer-face-left.png
omar.png
Confused.png
Gofer-face-right.png
rahul.png
Css3.png
Gofer-hello.png
sam.png
Defeat.png
Gofer-logo.png
teamphoto.png
Express.png
html5.png
Node_modules
Css (folder)
Footer.css
Joblisting.css
nav.css	
Reset.css
style.css
Package.json
index.js
README.md

#How to install or run the project
In the package folder run npm install
Run node ./index.js
Open localhost/3000 in your browser

#How to use the product

	As a regular user start by making an account and logging in. Here you can browse the tasks that the futuristic AI is recommending or create one of your own and post it to the jobs board. The jobs that you have posted will be dynamically be generated under All Tasks. 

	As a gofer you also need to signup and login but also wait for an interview from an admin. For the purposes of the demo the gofer can start accepting jobs from the jobs board immediately. They can view the ones they can accept, the ones they have already accepted and the ones they have completed. 

The login credentials for a generic user are:
Username: jerrya
Password: jerrya

The login credentials for a Gofer (someone who can complete jobs) is:
Username: soyoung
Password: soyoung

#Credits, References, and Licenses
reset.css 
	http://meyerweb.com/eric/tools/css/reset/ 
v2.0 | 20110126
License: none (public domain)

Tasks list
	ChatGPT was used to generate our task list.

#How did you use AI? Tell us exactly what AI services and products you used and how you used them. Be very specific:

We didn’t use chatgpt though we did use copilot and though it made writing code faster, it often suggested unwanted code. 
We did use Chatgpt to generate lists of fake data for our database. We asked it to creat a list of fake jobs and we provided it with the schema that we wanted it in.
Our App does NOT use any AI
ChatGPT does not always follow instructions so we had to manually fix our data.

# Team Members and Contact

Sam Lee
glee235@my.bcit.ca
Annyn Matheson
amatheson5@my.bcit.ca
Abhi Bagai
abagai@my.bcit.ca

Rahul Sharma
rsharma269@my.bcit.ca
Omar Mohamed
omohamed5@my.bcit.ca

# Libraries
   "bcrypt": "^5.1.1",
    "connect-mongo": "^5.1.0",
    "connect-mongodb-session": "^5.0.0",
    "dotenv": "^16.4.5",
    "ejs": "^3.1.10",
    "express": "^4.19.2",
    "express-session": "^1.18.0",
    "joi": "^17.13.1",
    "mongodb": "^6.6.2",
    "mongoose": "^8.3.3",
    "nodemon": "^3.1.1",
    "url": "^0.11.3"

