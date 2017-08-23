var express = require('express');
var app = express();
var session = require('express-session'); 
var bodyParser = require('body-parser');

var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');


// Get spreadsheet
// spreadsheet key is the long id in the sheets URL
var doc = new GoogleSpreadsheet('179SiRE_H-tN9OTiA70xZrcP4f7uYpLfBmdA7A5atAfk');
var sheet;

var itemSheet; 

var itemRows; 
var urlencodedParser = bodyParser.urlencoded({ extended: false })


/*
 * Setup the webserver. 
 * Format routing. 
 */
app.use(express.static('public'));
app.use(session({secret: 'hknsecret'})); 
/*
app.get('/hknscan.html', function (req, res) {
    console.log("loaded login page"); 
    if(req.session.username){
    console.log(req.session.username); 
        res.redirect("/buy.html" ); 
    } 
    else {
        res.sendFile( __dirname + "/" + "hknscan.html" );
    } 
})

app.get('/index.html', function (req, res) {
    console.log("loaded login page"); 
    if(req.session.username){
    console.log(req.session.username); 
        res.redirect("/buy.html" ); 
    } 
    else {
        res.sendFile( __dirname + "/" + "index.html" );
    } 
})
app.get('/current_user', function (req, res) { 
    res.send(req.session.username); 
});  

app.get('/current_id', function (req, res) {
    res.send(req.session.user_id); 
}); 

app.get('/current_balance', function (req, res) { 
    sheet.getRows({
      offset: 1,
    //  limit: 20,
    //  orderby: 'col2'
    }, function( err, rows ){
        console.log("userindex: "+req.session.userindex); 
        console.log("debt-credit: "+rows[req.session.userindex]['debt-credit']); 
        req.session.balance = rows[req.session.userindex]['debt-credit']; 
        console.log("first: "+req.session.balance); 
        res.send(req.session.balance); 
    });  
}); 

app.get('/login_status', function (req, res) { 
    console.log("sending login status: "+req.session.loginSuccess); 
    
    var responseObject = {
      "loginStatus": req.session.loginSuccess, 
      "loginMessage": req.session.loginMessage 
    }; 

    res.send(responseObject); 
}); 

app.get('/register_status', function (req, res) { 
    console.log("sending register status: "+req.session.registerSuccess); 
    
    var responseObject = {
      "registerStatus": req.session.registerSuccess, 
      "registerMessage": req.session.registerMessage 
    }; 

    res.send(responseObject); 
}); 



app.get('/logout', function (req, res) { 
    console.log("logging out"); 
    req.session.destroy(); 
    res.send(true); 
}); 

app.get('/register', function (req, res) { 
    if(req.session.loginSuccess){
      req.session.user_id = null; 
      req.session.username = null; 
      req.session.userindex = null; 
      //req.session.loginSuccess = false; 
      console.log("manually clearing session"); 
    } 
    console.log("register with this id: "+req.session.user_id); 
    res.sendFile( __dirname + "/" + "register.html" ); 
}); 
*/

/* 
 * Get / 
 */
app.get('/', function (req, res) {
    res.sendFile( __dirname + "/" + "index.html" ); 
    console.log("loaded index.html"); 
}); 


/*
 * Connect to google doc and get sheet. 
 */
async.series([
  function setAuth(step) {
    // see notes below for authentication instructions!
    var creds = require('./google-generated-creds.json');

    doc.useServiceAccountAuth(creds, step);
  },
  function getInfoAndWorksheets(step) {
    doc.getInfo(function(err, info) {
      if(err) {
        console.log(err); 
      } 
      else { 
        console.log('Loaded doc: '+info.title+' by '+info.author.email);
        sheet = info.worksheets[0];
        console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
        //itemSheet = info.worksheets[1]; 
      } 
      step();
    });
  }, 
  /*
  function getItemRows(step) { 
    itemSheet.getRows({
      offset: 1,
    }, function( err, rows ){
      itemRows = rows; 
      step()
    }); 
  } 
  */
]); 

app.post('/process_signin', urlencodedParser, function (req, res) {
  console.log("process signin starting ..."); 
  // Prepare output in JSON format
  response = {
    userid:req.body.pid, 
    major:req.body.major
  };

  async.series([
    function trySignIn(callback) {
                                          
      // google provides some query options
      sheet.getRows({
        offset: 1,
      //  limit: 20,
      //  orderby: 'col2'
      }, function( err, rows ){

        var err1 = null; 
        var foundId = false; 
        var name = ""; 

        // loop over all users 
        for (var i=0; i < rows.length; i++){
           

          // if found matching user 
          if( response.userid.toString().trim().toLowerCase() === rows[i].pid.toString().trim().toLowerCase()) { 

            foundId = true; 
            console.log("found matching id"); 

            rows[i]['major'] = response.major.toString().trim(); 

            if (rows[i]['checked'] !== "Checked") {
              err1 = "Error: Problem with student registration."; 
              rows[i]['signin'] = "denied"; 
              rows[i].save(); 
            }
            else{

              name += rows[i]['firstname'] + " " + rows[i]['lastname']; 
              rows[i]['signin'] = Date().toString(); 
              rows[i].save(); 
            }

            break; 

          } 
        } 

        if (!foundId) { 
          err1 = "Error: Student not registered."; 
        } 
 

        callback(err1, name); 
      });
    } 
 
  ], 
  function(err, results) { 

    signinMessage = ""; 

    if(err) { 
      signinMessage = '<div class="alert alert-danger" roles="alert" id="signinMessage">Error: Student not registered.</div>'; 
    } 
    else { 
      signinMessage = '<div class="alert alert-success" roles="alert" id="signinMessage">Success! ' + results[0] + ' has been signed in.</div>'; 
    } 
    
    res.send(signinMessage); 

  }); 
  //res.end(JSON.stringify(response));
}); 

app.post('/process_registration', urlencodedParser, function (req, res) {
  console.log("process registration starting ..."); 

  // Prepare output in JSON format
  response = {
    userid:req.body.inputId, 
    username:req.body.inputName, 
    balance:req.body.inputBalance
  };

  /*
  req.session.user_id = response.userid.toString().trim(); 
  req.session.username = response.username.toString().trim(); 
  req.session.balance = response.balance.toString().trim(); 
  */
 
  async.series([

    function checkUser(callback) { 
      sheet.getRows({
        offset: 1,
      }, function( err, rows ){
        var err1 = null; 
        if (err) { 
          err1 = err; 
        } 
        else { 
          for (var i=0; i < rows.length; i++){
            if( response.userid.toString().trim() === rows[i].userid) { 
              err1 = "Error: Duplicate user id." 
            } 
          } 
        } 
        callback(err1, "success");  
      });

    }, 
    function tryRegister(callback) {
                                          
      sheet.addRow({
          'userid': response.userid.toString().trim(), 
          'username': response.username.toString().trim(),  
          'debt-credit': response.balance.toString().trim()
      }, function(err){

        callback(err, "success"); 
          
      });
    }
 
  ], 
  function(err, results) { 
    if (err) { 
      req.session.registerSuccess = false; 
      req.session.registerMessage = `<div class="alert alert-danger" role="alert">Problem creating new user.<br> `+err+`</div>`
      res.redirect("/register"); 
    } 
    else { 
      req.session.loginSuccess = false; 
      req.session.registerSuccess = true; 
      req.session.loginMessage = `<div class="alert alert-success" role="alert"><strong>Success!</strong> New user created. Please login.</div>`

      res.redirect("/"); 
    } 
    
  }); 
  //res.end(JSON.stringify(response));
}); 

var server = app.listen(4321, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)

})
