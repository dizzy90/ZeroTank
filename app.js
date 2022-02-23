const express   = require("express");
const app       = express();
const http      = require('http').Server(app);
const port      = process.env.PORT || 80;
const io        = require('socket.io')(http);
var  exec       = require('child_process').exec, child;

const Gpio = require('pigpio').Gpio;
const A1        = new Gpio(27, {mode: Gpio.OUTPUT});
const A2        = new Gpio(22, {mode: Gpio.OUTPUT});
const B1        = new Gpio(23, {mode: Gpio.OUTPUT});
const B2        = new Gpio(24, {mode: Gpio.OUTPUT});
const LED       = new Gpio(25, {mode: Gpio.OUTPUT});
const CHRG_C    = new Gpio(5,  {mode: Gpio.INPUT});
const CHRG_F    = new Gpio(6,  {mode: Gpio.INPUT});

const start_cam = 'sudo bash /home/pi/ZeroTank/stream.sh';
const stop_cam  = 'sudo killall mjpg_streamer';
var report      = false;        // Is reporting activated?
var conn_count  = 0;            // Number of connections to server
var charging    = 0;            // 0 = battery, 1 = charging, 2 = fully charged

// Define where .html resides
app.use(express.static(__dirname + '/src'));

// Define main page (index)
app.get('/', (req, res) => {
    res.sendfile('index.html');
    console.log('HTML sent to client');
});

// Get timestamp... Fu javascript
function getTimestamp () {
    var date = new Date();

    var day     = date.getDate();
    var month   = date.getMonth();
    var year    = date.getFullYear();
    var hour    = date.getHours();
    var min     = date.getMinutes();
    var sec     = date.getSeconds();

    // January is 0...
    month = month + 1;

    // Handle single digit date/month
    if (day.toString().length == 1) {
        day = '0' + day.toString();
    }
    if (month.toString().length == 1) {
        month = '0' + month.toString();
    }

    var timestamp = day + "-" + month + "-" + year + "_" + hour + min + sec;
    return timestamp;
}

// Whenever someone connects this gets executed
io.on('connection', function(socket) {
    console.log('A user connected');
    // Count active users
    conn_count++;
    // Start camera
    child = exec(start_cam, function(error, stdout, stderr) {});

    // Handle motor request
    socket.on('pos', function (msx, msy) {
        // Debug motors
        //console.log('X:' + msx + ' Y: ' + msy);
        //io.emit('posBack', msx, msy);

        msx = Math.min(Math.max(parseInt(msx), -255), 255);
        msy = Math.min(Math.max(parseInt(msy), -255), 255);

        if (msx > 0) {
            A1.pwmWrite(msx);
            A2.pwmWrite(0);
        }
        else {
            A1.pwmWrite(0);
            A2.pwmWrite(Math.abs(msx));
        }

        if (msy > 0) {
            B1.pwmWrite(msy);
            B2.pwmWrite(0);
        }
        else {
            B1.pwmWrite(0);
            B2.pwmWrite(Math.abs(msy));
        }
    });

    // Handle power off request
    socket.on('power', function(value) {
        child = exec("sudo poweroff");
    });

    // Handle reboot request
    socket.on('reboot', function(value) {
        child = exec("sudo reboot");
    });

    // Handle camera on/off toggle request
    socket.on('cam_state', function(toggle) {
        if (toggle == 1) {
            child = exec(start_cam, function(error, stdout, stderr) {
                io.emit('cam', 1);
            });
        }
        else {
            child = exec(stop_cam, function(error, stdout, stderr) {});
        }
    });

    // Handle IR LED on/off toggle request
    socket.on('irled', function(toggle) {
        LED.digitalWrite(toggle);    
    });  

    // Handle taking picture request
    socket.on('cam', function(value) {
        console.log('Taking a picture..');

        var timestamp = getTimestamp();
        // Turn off stream, take photo, start stream
        var take_picture = stop_cam + ' ; raspistill -o /home/pi/pictures/cam_' + timestamp + '.jpg -n && ' + start_cam;
        console.log("command: ", take_picture);
        child = exec(take_picture, function(error, stdout, stderr) {
            io.emit('cam', 1);
        });
    });
  
    // Handle reporting to UI
    if (report == false) {
        report = true;
        doReports = setInterval(function() { // send reports every 5 sec
            // Handle temperature reporting
            var child = exec("cat /sys/class/thermal/thermal_zone0/temp", function(error, stdout, stderr) {
                if (error !== null) {
                    console.log('exec error: ' + error);
                }
                else {
                    var temp = parseFloat(stdout)/1000;
                    io.emit('temp', temp);
                    console.log('temp', temp);
                }
            });

            // Handle charging status reporting
            if (CHRG_C.digitalRead() == 1) {
                charging = 1;
            }
            else if (CHRG_F.digitalRead() == 1) {
                charging = 2;
            }
            else {
                charging = 0;
            }

            switch (charging) {
                case 0:
                    io.emit('chargestate', "Battery Power");
                    break;
                case 1:
                    io.emit('chargestate', "Battery Charging");
                    break;
                case 2:
                    io.emit('chargestate', "Battery Charged");
                    break;
            }
        }, 5000);
    }

    // Whenever someone disconnects this piece of code is executed
    socket.on('disconnect', function () {
        console.log('A user disconnected');
        conn_count--;

        // Only kill if no clients are connected
        if (conn_count == 0) {
            console.log('Killing reporter, ID: ' + doReports);
            clearInterval(doReports);
            report = false;
            child = exec(stop_cam, function(error, stdout, stderr) {});
        }
    });

});

http.listen(port, function(){
    console.log('listening on *:' + port);
});

