const express = require('express');
const router = express.Router();
const moment = require('moment');

// auth packages

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;
const AWS = require('aws-sdk');
const request = require('request');
const jwkToPem = require('jwk-to-pem');
const jwt = require('jsonwebtoken');
global.fetch = require('node-fetch');

const poolData = {
  UserPoolId: 'mypoolId', // Your user pool id here    
  ClientId: 'clientid' // Your client id here
};
AWS.config.update({
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'mypoolId'
  }),
  region: 'us-west-2'
});

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

const {
  Client
} = require('pg');
const connectionData = {
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT
}
const client = new Client(connectionData);
client.connect()


router.post('/signup', registerUser, (req, res) => {
  var body = req.body;
  var gender = 0;
  if (body.male === true) {
    gender = 1
  }
  var avatar = {
    hairType: req.body.hairType,
    eyesType: req.body.eyesType,
    headType: req.body.headType,
    bodyType: req.body.bodyType,
    shirtColor: req.body.shirtColor,
    skinColor: req.body.skinColor,
    lipsColor: req.body.lipsColor,
    hairColor: req.body.hairColor
  }
  var password = req.body.password;
  if (!password.match(passwordRegExp)) {
    res.sendStatus(403);
  } else {
    // signup
    // registerUser(req.body);
    var session_active = 1;
    client.query(`SELECT * FROM users WHERE email = '${body.email}'`)
      .then(document => {
        if (document.rows.length === 0) {
          client.query(`INSERT INTO users(mobile_number, email, full_name, session_active, last_login, joined) 
        VALUES( ${body.phoneNumber}, '${body.email}', '${body.name}', ${session_active}, NOW(), NOW())`)
            .then(newUser => {
              client.query(`SELECT * FROM users WHERE email = '${body.email}'`)
                .then(user => {
                  client.query(`INSERT INTO user_params(user_id, gender, birthdate, avatar_config, weight, height, activity_level, exercise_level, metric_system)
            VALUES(${user.rows[0].user_id}, ${gender}, NOW() , '${JSON.stringify(avatar)}', ${body.weight}, ${body.height}, ${body.activityLevel}, ${body.excerciseIntensity}, ${body.metric_system})`)
                    .then(params => {
                      res.send({
                        success: true,
                        message: "",
                        data: {
                          user_id: user.rows[0].user_id
                        }
                      });
                    })
                    .catch(err => {

                    })
                })
            })
            .catch(err => {
              console.log(err);
            })
        } else {
          res.send({
            success: false,
            message: 'The email address you have entered is already registered'
          })
        }
      })
  }
})

function registerUser(req, res, next) {
  
  var attributeList = [];
  // attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"full_name",Value: data.full_name}));
  // attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"gender",Value:data.gender}));
  // attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"birthdate",Value: data.birthday}));
  attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"email",Value: req.body.email}));
  attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"phone_number",Value: req.body.mobile_number}));


  userPool.signUp(req.body.email, req.body.password, attributeList, null, function (err, result) {
      event = {
        request: {
          "userAttributes": {
            "email": req.body.email
          },
          "validationData": {
            "Name": "email",
            "Value": req.body.email
          }
        },
        response: { 
          autoVerifyEmail: true
        }
      }
      var confirmParams = {
        UserPoolId: 'userpoolid',
        Username: req.body.email
      };
      // Confirm the user
      
      cognitoidentityserviceprovider.adminConfirmSignUp(confirmParams, function(err, result) {
        if (err) console.log(err, err.stack);
        if (event.request.userAttributes.hasOwnProperty("email")) {
          event.response.autoVerifyEmail = 'true';
      }

      // Return to Amazon Cognito
      callback(null, event);
      if (err) {
        console.log("Error aws: ", err.message);
        // return;
      }
      cognitoUser = result.user;
      console.log('user name is ' + cognitoUser.getUsername());
      next();
      // return;
    });

  });

}
