var Vector2 = function (x,y) {
    this.x = x || 0; 
    this.y = y || 0; 
};

Vector2.prototype = {
    reset: function ( x, y ) {
        this.x = x;
        this.y = y;
        return this;
    },

    copyFrom : function (v) {
        this.x = v.x;
        this.y = v.y;
    },
    
    plusEq : function (v) {
        this.x+=v.x;
        this.y+=v.y;
        
        return this; 
    },
    
    minusEq : function (v) {
        this.x-=v.x;
        this.y-=v.y;
        
        return this; 
    },
        
    equals : function (v) {
        return((this.x==v.x)&&(this.y==v.x));
    }

};

var canvas,
    c, // c is the canvas' context 2D
    container, 
    halfWidth, 
    halfHeight,
    leftTouchID = -1, 
    leftTouchPos = new Vector2(0,0),
    leftTouchStartPos = new Vector2(0,0),
    leftVector = new Vector2(0,0);

var temperature;
var socket = io(); // comment this out for better debugging
var sendFlag = false;

setupCanvas();

var mouseX, mouseY, 
    // is this running in a touch capable environment?
    mouseDown = false,
    touches = []; // array of touch vectors;

setInterval(draw, 1000/30); // draw app at 30fps
setInterval(sendControls, 1000/20); // send control input at 20fps

canvas.addEventListener( 'touchstart', onTouchStart, false );
canvas.addEventListener( 'touchmove', onTouchMove, false );
canvas.addEventListener( 'touchend', onTouchEnd, false );
window.onorientationchange = resetCanvas;  
window.onresize = resetCanvas;  

canvas.addEventListener( 'mousemove', onMouseMove, false );
canvas.addEventListener( 'mousedown', onMouseDown, false );
canvas.addEventListener( 'mouseup', onMouseUp, false );

function resetCanvas (e) {  
    // resize the canvas - but remember - this clears the canvas too. 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;

    //halfWidth = canvas.width/2; 
    halfWidth = canvas.width;
    halfHeight = canvas.height/2;

    //make sure we scroll to the top left. 
    window.scrollTo(0,0); 
}

var rawLeft, rawRight, MaxJoy = 255, MinJoy = -255, MaxValue = 255,
    MinValue = -255, RawLeft, RawRight, ValLeft, ValRight;
var leftMot = 0, rightMot = 0;

function Remap(value, from1, to1, from2, to2){
    return (value - from1) / (to1 - from1) * (to2 - from2) + from2;
}

//source: http://www.dyadica.co.uk/basic-differential-aka-tank-drive/
function tankDrive(x, y){
    // First hypotenuse
    var z = Math.sqrt(x * x + y * y);
    // angle in radians
    var rad = Math.acos(Math.abs(x) / z);

    if (isNaN(rad)) rad = 0;
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
    if ((x >= 0 && y >= 0) || (x < 0 && y < 0)){
        rawLeft = move;
        rawRight = turn;
    }
    else{
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

function init(){
}

function draw() {
    c.clearRect(0,0,canvas.width, canvas.height); 

    //if touch
    for(var i=0; i<touches.length; i++) {            
        var touch = touches[i]; 

        if(touch.identifier == leftTouchID){
            c.beginPath(); 
            c.strokeStyle = "white"; 
            c.lineWidth = 6; 
            c.arc(leftTouchStartPos.x, leftTouchStartPos.y, 40,0,Math.PI*2,true); 
            c.stroke();
            c.beginPath(); 
            c.strokeStyle = "white"; 
            c.lineWidth = 2; 
            c.arc(leftTouchStartPos.x, leftTouchStartPos.y, 60,0,Math.PI*2,true); 
            c.stroke();
            c.beginPath(); 
            c.strokeStyle = "white"; 
            c.arc(leftTouchPos.x, leftTouchPos.y, 40, 0,Math.PI*2, true); 
            c.stroke(); 
        }
        else{ 
            c.beginPath(); 
            c.fillStyle = "white";
            //c.fillText("touch id : "+touch.identifier+" x:"+touch.clientX+" y:"+touch.clientY, touch.clientX+30, touch.clientY-30); 
            c.beginPath(); 
            c.strokeStyle = "red";
            c.lineWidth = "6";
            c.arc(touch.clientX, touch.clientY, 40, 0, Math.PI*2, true); 
            c.stroke();
        }
    }
    
    //if no touch       
    if(mouseDown){
        c.beginPath(); 
        c.strokeStyle = "white"; 
        c.lineWidth = 6; 
        c.arc(leftTouchStartPos.x, leftTouchStartPos.y, 40,0,Math.PI*2,true); 
        c.stroke();
        c.beginPath(); 
        c.strokeStyle = "white"; 
        c.lineWidth = 2; 
        c.arc(leftTouchStartPos.x, leftTouchStartPos.y, 60,0,Math.PI*2,true); 
        c.stroke();
        c.beginPath(); 
        c.strokeStyle = "white"; 
        c.arc(leftTouchPos.x, leftTouchPos.y, 40, 0,Math.PI*2, true); 
        c.stroke(); 
        c.fillStyle  = "white"; 
        //c.fillText("mouse : "+mouseX+", "+mouseY, mouseX, mouseY); 
        c.beginPath(); 
        c.strokeStyle = "white";
        c.lineWidth = "6";
        c.arc(mouseX, mouseY, 40, 0, Math.PI*2, true); 
        c.stroke();
    }

    //c.fillText("Left Motor: " + leftMot + " Right Motor: " + rightMot, 10, 30);
    //c.fillText("Left Vx: " + leftVector.x + " Left Vy: " + leftVector.y, 10, 50);
    //c.fillText("Temperature: "+temperature+"°C", 10, 30);

    socket.on('temp', function(msg){
        document.getElementById("temp").innerHTML = parseInt(msg) + '°C';
        temperature = msg;
    });

    socket.on('volt', function(msg){
        voltage = msg;
        if(voltage > 0){ // Don't show voltage without ADC
            document.getElementById("volt").innerHTML = msg.toFixed(2) + 'V';
        }
        else{
            document.getElementById("volt").innerHTML = ' ';
        }
    });
    
    socket.on('cam', function(msg){
        document.getElementById("stream").innerHTML = img;
    });
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
    for(var i = 0; i<e.changedTouches.length; i++){
        var touch =e.changedTouches[i]; 
        //console.log(leftTouchID + " " 
        if((leftTouchID<0) && (touch.clientX<halfWidth)){
            leftTouchID = touch.identifier; 
            leftTouchStartPos.reset(touch.clientX, touch.clientY);  
            leftTouchPos.copyFrom(leftTouchStartPos); 
            leftVector.reset(0,0); 
            continue;       
        }
        else{
            makeBullet(); 
        }   
    }
    touches = e.touches; 
}

function onMouseDown(event) {
    leftTouchStartPos.reset(event.offsetX, event.offsetY);  
    leftTouchPos.copyFrom(leftTouchStartPos); 
    leftVector.reset(0,0); 
    mouseDown = true;
}
 
function onTouchMove(e) {
     // Prevent the browser from doing its default thing (scroll, zoom)
    e.preventDefault();

    for(var i = 0; i<e.changedTouches.length; i++){
        var touch =e.changedTouches[i]; 
        if(leftTouchID == touch.identifier){
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
    if(mouseDown){
        leftTouchPos.reset(event.offsetX, event.offsetY); 
        leftVector.copyFrom(leftTouchPos); 
        leftVector.minusEq(leftTouchStartPos);  
        sendFlag = true;
    }
}
 
function onTouchEnd(e) { 
    touches = e.touches; 

    for(var i = 0; i<e.changedTouches.length; i++){
        var touch =e.changedTouches[i]; 
        if(leftTouchID == touch.identifier){
            leftTouchID = -1; 
            leftVector.reset(0,0);
            leftMot = rightMot = 0;
            sendFlag = true;
            break;      
        }       
    }
}

function onMouseUp(event) { 
    leftVector.reset(0,0);
    leftMot = rightMot = 0;
    mouseDown = false;
    sendFlag = true;
}

/*
Source for keyboard detection: Braden Best:
https://stackoverflow.com/questions/5203407/how-to-detect-if-multiple-keys-are-pressed-at-once-using-javascript
*/  
var map = {};
onkeydown = onkeyup = function(e){
    e = e || event; // to deal with IE
    map[e.keyCode] = e.type == 'keydown';
    
    if(map[38]){ // ArrowUp
        leftVector.y = -255;
    }
    if(map[40]){ // ArrowDown
        leftVector.y = 255;
    }
    if(map[37]){ // ArrowLeft
        leftVector.x = -255;
    }
    if(map[39]){ // ArrowRight
        leftVector.x = 255;
    }
    
    if(!map[38] && !map[40]){ // ArrowUp/Down is not pressed
        leftVector.y = 0;
    }
    if(!map[37] && !map[39]){ // ArrowLeft/Right is not pressed
        leftVector.x = 0;
    }
    if(leftVector.y == 0 && leftVector.x == 0) leftMot = rightMot = 0;
    sendFlag = true;
}

function setupCanvas() {
    canvas = document.createElement( 'canvas' );
    c = canvas.getContext( '2d' );
    container = document.createElement( 'div' );
    container.className = "container";

    document.body.appendChild( container );
    container.appendChild(canvas);  

    resetCanvas(); 
    
    c.strokeStyle = "#ffffff";
    c.lineWidth =2; 
}

function mouseOver(minX, minY, maxX, maxY){
    return(mouseX>minX&&mouseY>minY&&mouseX<maxX&&mouseY<maxY);
}

function sendControls(){
    if(sendFlag == true){
        leftVector.x = Math.min(Math.max(parseInt(leftVector.x), -255), 255);
        leftVector.y = Math.min(Math.max(parseInt(leftVector.y), -255), 255);
        
        tankDrive(leftVector.x, -leftVector.y);
        if(leftMot > 0) leftMot += 90;
        if(leftMot < 0) leftMot -= 90;
        if(rightMot > 0) rightMot += 90;
        if(rightMot < 0) rightMot -= 90;
        leftMot = Math.min(Math.max(parseInt(leftMot), -255), 255);
        rightMot = Math.min(Math.max(parseInt(rightMot), -255), 255);
        
        socket.emit('pos', leftMot, rightMot);
        sendFlag = false;
    }
}

