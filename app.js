const express = require("express");
const app = express();
const http = require('http').Server(app);
const  port = process.env.PORT || 80;
const  io = require('socket.io')(http);
var  exec = require('child_process').exec, child;

const start_cam = 'sudo bash /home/pi/ZeroTank/stream.sh';
const stop_cam  = 'sudo killall mjpg_streamer';
var do_report = false;      // Is temperature being reported?
var conn_count = 0;         // Number of connections to server
var charging = 0;           // 0 = battery, 1 = charging, 2 = fully charged

const Gpio = require('pigpio').Gpio;
const A1      = new Gpio(27, {mode: Gpio.OUTPUT});
const A2      = new Gpio(22, {mode: Gpio.OUTPUT});
const B1      = new Gpio(23, {mode: Gpio.OUTPUT});
const B2      = new Gpio(24, {mode: Gpio.OUTPUT});
const LED     = new Gpio(25, {mode: Gpio.OUTPUT});
const CHRG_C  = new Gpio(5,  {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_DOWN,
    edge: Gpio.EITHER_EDGE
});
const CHRG_F  = new Gpio(6,  {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_DOWN,
    edge: Gpio.EITHER_EDGE
});

app.use(express.static(__dirname + '/src'));

app.get('/', (req, res) => {
    res.sendfile('index.html');
    console.log('HTML sent to client');
});

// Get timestamp... Fu javascript
function getTimestamp () {
    var date = new Date();

    var day = date.getDate();
    var month = date.getMonth();
    var year = date.getFullYear();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();

    var timestamp = day + "-" + (++month) + "-" + year + "_" + hour + "_" + min + "_" + sec;
    return timestamp;
}

// Whenever someone connects this gets executed
io.on('connection', function(socket) {
    console.log('A user connected');
    // Count active users
    conn_count++;
    // Start camera
    child = exec(start_cam, function(error, stdout, stderr) {});

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

    socket.on('power', function(value) {
        child = exec("sudo poweroff");
    });

    socket.on('reboot', function(value) {
        child = exec("sudo reboot");
    });

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

    socket.on('irled', function(toggle) {
        LED.digitalWrite(toggle);    
    });  

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
  
    // Whenever someone disconnects this piece of code is executed
    socket.on('disconnect', function () {
        console.log('A user disconnected');
        conn_count--;

        // Only kill if no clients are connected
        if (conn_count == 0) {
            console.log('Killing temp report, ID: ' + doTemps);
            clearInterval(doTemps);
            do_report = false;
            child = exec(stop_cam, function(error, stdout, stderr) {});
        }
    });

    CHRG_C.on('interrupt', (value) => {
        if (value == 1) {
            console.log("CHARGING: YES");
            charging = 1;
        }
        else {
            charging = 0;
        }
    });

    CHRG_F.on('interrupt', (value) => {
        if (value == 1) {
            console.log("CHARGING: FULL");
            charging = 2;
        }
        else {
            console.log("CHARGING: NO");
            charging = 0;
        }
    });


    if (do_report == false) {
        do_report = true;

        // Handle temperature reporting
        doTemps = setInterval(function() { // send temperature every 5 sec
            var child = exec("cat /sys/class/thermal/thermal_zone0/temp", function(error, stdout, stderr) {
                if (error !== null) {
                    console.log('exec error: ' + error);
                }
                else {
                    var temp = parseFloat(stdout)/1000;
                    io.emit('temp', temp);
                    console.log('temp', temp);
                }

                // Handle charging status reporting
                switch (charging) {
                    case 0:
                        io.emit('chargestate', "Batt. Power");
                        break;
                    case 1:
                        io.emit('chargestate', "Batt. Charging");
                        break;
                    case 2:
                        io.emit('chargestate', "Batt. Charged");
                        break;
                }
            });
        }, 5000);
    }
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});

