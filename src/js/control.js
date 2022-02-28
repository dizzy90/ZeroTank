var Vector2 = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
};

Vector2.prototype = {
    reset: function(x, y) {
        this.x = x;
        this.y = y;
        return this;
    },

    copyFrom : function(v) {
        this.x = v.x;
        this.y = v.y;
    },

    plusEq : function(v) {
        this.x+=v.x;
        this.y+=v.y;

        return this;
    },

    minusEq : function(v) {
        this.x-=v.x;
        this.y-=v.y;

        return this;
    },

    equals : function(v) {
        return ((this.x == v.x) && (this.y == v.x));
    }

};

var canvas;
var c; // c is the canvas' context 2D
var container;
var halfWidth;
var halfHeight;
var leftTouchID = -1;
var leftTouchPos = new Vector2(0, 0);
var leftTouchStartPos = new Vector2(0, 0);
var leftVector = new Vector2(0, 0);

var socket = io(); // comment this out for better debugging
var sendFlag = false;

setupCanvas();

// is this running in a touch capable environment?
var mouseX;
var mouseY;
var mouseDown = false;
var touches = []; // array of touch vectors;

setInterval(draw, 1000/30); // draw app at 30fps
setInterval(sendControls, 1000/20); // send control input at 20fps

canvas.addEventListener('touchstart', onTouchStart, false);
canvas.addEventListener('touchmove', onTouchMove, false);
canvas.addEventListener('touchend', onTouchEnd, false);
window.onorientationchange = resetCanvas;
window.onresize = resetCanvas;

canvas.addEventListener('mousemove', onMouseMove, false);
canvas.addEventListener('mousedown', onMouseDown, false);
canvas.addEventListener('mouseup', onMouseUp, false);

function resetCanvas(e) {
    // resize the canvas - but remember - this clears the canvas too.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    halfWidth = canvas.width;
    halfHeight = canvas.height/2;

    // make sure we scroll to the top left.
    window.scrollTo(0,0);
}

var MaxJoy = 255;
var MinJoy = -255;
var MaxValue = 255;
var MinValue = -255;
var rawLeft;
var rawRight;
var RawLeft;
var RawRight;
var ValLeft;
var ValRight;
var leftMot = 0;
var rightMot = 0;

function Remap(value, from1, to1, from2, to2) {
    return (value - from1) / (to1 - from1) * (to2 - from2) + from2;
}

//source: http://www.dyadica.co.uk/basic-differential-aka-tank-drive/
function tankDrive(x, y) {
    // First hypotenuse
    var z = Math.sqrt(x * x + y * y);
    // angle in radians
    var rad = Math.acos(Math.abs(x) / z);

    if (isNaN(rad)) {
        rad = 0;
    }
    // and in degrees
    var angle = rad * 180 / Math.PI;

    // Now angle indicates the measure of turn
    // Along a straight line, with an angle o, the turn co-efficient is same
    // this applies for angles between 0-90, with angle 0 the co-eff is -1
    // with angle 45, the co-efficient is 0 and with angle 90, it is 1
    var tcoeff = -1 + (angle / 90) * 2;
    var turn = tcoeff * Math.abs(Math.abs(y) - Math.abs(x));

    turn = Math.round(turn * 100) / 100;
    // And max of y or x is the movement
    var move = Math.max(Math.abs(y), Math.abs(x));

    // First and third quadrant
    if ((x >= 0 && y >= 0) || (x < 0 && y < 0)) {
        rawLeft = move;
        rawRight = turn;
    }
    else {
        rawRight = move;
        rawLeft = turn;
    }

    // Reverse polarity
    if (y < 0) {
        rawLeft = 0 - rawLeft;
        rawRight = 0 - rawRight;
    }

    RawLeft = rawLeft;
    RawRight = rawRight;

    leftMot = Remap(rawLeft, MinJoy, MaxJoy, MinValue, MaxValue);
    rightMot = Remap(rawRight, MinJoy, MaxJoy, MinValue, MaxValue);
}

function draw() {
    c.clearRect(0, 0, canvas.width, canvas.height);

    // if touch
    for (var i = 0; i < touches.length; i++) {
        var touch = touches[i];

        if (touch.identifier == leftTouchID) {
            c.beginPath();
            c.strokeStyle = "white";
            c.lineWidth = 6;
            c.arc(leftTouchStartPos.x, leftTouchStartPos.y, 40, 0, Math.PI*2, true);
            c.stroke();
            c.beginPath();
            c.strokeStyle = "white";
            c.lineWidth = 2;
            c.arc(leftTouchStartPos.x, leftTouchStartPos.y, 60, 0, Math.PI*2, true);
            c.stroke();
            c.beginPath();
            c.strokeStyle = "white";
            c.arc(leftTouchPos.x, leftTouchPos.y, 40, 0, Math.PI*2, true);
            c.stroke();
        }
        else {
            c.beginPath();
            c.fillStyle = "white";
            c.beginPath();
            c.strokeStyle = "red";
            c.lineWidth = 6;
            c.arc(touch.clientX, touch.clientY, 40, 0, Math.PI*2, true);
            c.stroke();
        }
    }

    // if no touch
    if (mouseDown) {
        c.beginPath();
        c.strokeStyle = "white";
        c.lineWidth = 6;
        c.arc(leftTouchStartPos.x, leftTouchStartPos.y, 40, 0, Math.PI*2, true);
        c.stroke();
        c.beginPath();
        c.strokeStyle = "white";
        c.lineWidth = 2;
        c.arc(leftTouchStartPos.x, leftTouchStartPos.y, 60, 0, Math.PI*2, true);
        c.stroke();
        c.beginPath();
        c.strokeStyle = "white";
        c.arc(leftTouchPos.x, leftTouchPos.y, 40, 0, Math.PI*2, true);
        c.stroke();
        c.fillStyle  = "white";
        c.beginPath();
        c.strokeStyle = "white";
        c.lineWidth = 6;
        c.arc(mouseX, mouseY, 40, 0, Math.PI*2, true);
        c.stroke();
    }
}

/*
 *  Touch event (e) properties :
 *  e.touches:          Array of touch objects for every finger currently touching the screen
 *  e.targetTouches:    Array of touch objects for every finger touching the screen that
 *                      originally touched down on the DOM object the transmitted the event.
 *  e.changedTouches    Array of touch objects for touches that are changed for this event.
 *                      I'm not sure if this would ever be a list of more than one, but would
 *                      be bad to assume.
 *
 *  Touch objects :
 *
 *  identifier: An identifying number, unique to each touch event
 *  target: DOM object that broadcast the event
 *  clientX: X coordinate of touch relative to the viewport (excludes scroll offset)
 *  clientY: Y coordinate of touch relative to the viewport (excludes scroll offset)
 *  screenX: Relative to the screen
 *  screenY: Relative to the screen
 *  pageX: Relative to the full page (includes scrolling)
 *  pageY: Relative to the full page (includes scrolling)
 */

function onTouchStart(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
        var touch = e.changedTouches[i];
        if ((leftTouchID < 0) && (touch.clientX < halfWidth)) {
            leftTouchID = touch.identifier;
            leftTouchStartPos.reset(touch.clientX, touch.clientY);
            leftTouchPos.copyFrom(leftTouchStartPos);
            leftVector.reset(0, 0);
            continue;
        }
        else {
            makeBullet();
        }
    }
    touches = e.touches;
}

function onMouseDown(event) {
    leftTouchStartPos.reset(event.offsetX, event.offsetY);
    leftTouchPos.copyFrom(leftTouchStartPos);
    leftVector.reset(0, 0);
    mouseDown = true;
}

function onTouchMove(e) {
     // Prevent the browser from doing its default thing (scroll, zoom)
    e.preventDefault();

    for (var i = 0; i<e.changedTouches.length; i++) {
        var touch = e.changedTouches[i];
        if (leftTouchID == touch.identifier) {
            leftTouchPos.reset(touch.clientX, touch.clientY);
            leftVector.copyFrom(leftTouchPos);
            leftVector.minusEq(leftTouchStartPos);
            sendFlag = true;
            break;
        }
    }
    touches = e.touches;
}

function onMouseMove(event) {
    mouseX = event.offsetX;
    mouseY = event.offsetY;
    if (mouseDown) {
        leftTouchPos.reset(event.offsetX, event.offsetY);
        leftVector.copyFrom(leftTouchPos);
        leftVector.minusEq(leftTouchStartPos);
        sendFlag = true;
    }
}

function onTouchEnd(e) {
    touches = e.touches;

    for (var i = 0; i < e.changedTouches.length; i++) {
        var touch = e.changedTouches[i];
        if (leftTouchID == touch.identifier) {
            leftTouchID = -1;
            leftVector.reset(0, 0);
            leftMot = rightMot = 0;
            sendFlag = true;
            break;
        }
    }
}

function onMouseUp(event) {
    leftVector.reset(0, 0);
    leftMot = 0;
    rightMot = 0;
    mouseDown = false;
    sendFlag = true;
}

/*
Source for keyboard detection: Braden Best:
https://stackoverflow.com/questions/5203407/how-to-detect-if-multiple-keys-are-pressed-at-once-using-javascript
*/
onkeydown = onkeyup = function(e) {
    var map = {};
    e = e || event; // to deal with IE
    map[e.keyCode] = e.type == 'keydown';

    // Arrow Up
    if (map[38]) {
        leftVector.y = -100;
    }
    // Arrow Down
    if (map[40]) {
        leftVector.y = 100;
    }
    // Arrow Left
    if (map[37]) {
        leftVector.x = -100;
    }
    // Arrow Right
    if (map[39]) {
        leftVector.x = 100;
    }

    // Arrow Up/Down not pressed
    if (!map[38] && !map[40]) {
        leftVector.y = 0;
    }
    // Arrow Left/Right not pressed
    if (!map[37] && !map[39]) {
        leftVector.x = 0;
    }
    if( leftVector.y == 0 && leftVector.x == 0) {
        leftMot = rightMot = 0;
    }
    sendFlag = true;
}

function setupCanvas() {
    canvas = document.createElement('canvas');
    c = canvas.getContext('2d');
    container = document.createElement('div');
    container.className = "container";

    document.body.appendChild(container);
    container.appendChild(canvas);

    resetCanvas();

    c.strokeStyle = "#ffffff";
    c.lineWidth = 2;
}

function mouseOver(minX, minY, maxX, maxY) {
    return(mouseX > minX && mouseY > minY && mouseX < maxX && mouseY < maxY);
}

function sendControls() {
    if (sendFlag) {
        leftVector.x = Math.min(Math.max(parseInt(leftVector.x), -255), 255);
        leftVector.y = Math.min(Math.max(parseInt(leftVector.y), -255), 255);

        tankDrive(leftVector.x, -leftVector.y);
        if (leftMot > 0) leftMot += 50;
        if (leftMot < 0) leftMot -= 50;
        if (rightMot > 0) rightMot += 50;
        if (rightMot < 0) rightMot -= 50;
        leftMot = Math.min(Math.max(parseInt(leftMot), -255), 255);
        rightMot = Math.min(Math.max(parseInt(rightMot), -255), 255);

        socket.emit('pos', leftMot, rightMot);
    }
    sendFlag = false;
}

