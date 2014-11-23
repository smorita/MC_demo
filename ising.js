function Ising() {
    var l=100;
    var n = l*l;
    var tc = 2.0/(Math.log(Math.sqrt(2.0)+1.0)); // T_c(SQ)
    var temp = tc;
    var algorithm = 0;

    var running = false;
    var timerID;
    var basetime = 0;
    var interval = 40; // [msec]

    var w=3;
    var canvas = document.getElementById('ising');
    var context = canvas.getContext('2d');
    canvas.width = canvas.height = l*(w+1)-1;

    var spin = new Array(n);
    var spinBefore = new Array(n);
    for(var i=0;i<n;++i) {
        spin[i] = (Math.random()<0.5) ? 1 : -1;
        spinBefore[i] = 0;
    }

    var cluster = new Array(n);

    function draw() {
        context.fillStyle = '#3366cc';
        for(var i=0;i<l;++i) {
            for(var j=0;j<l;++j) {
                var idx = i*l+j;
                if(spin[idx]==1 && spinBefore[idx]!=1)
                    context.fillRect(j*(w+1),i*(w+1),w,w);
            }
        }
        context.fillStyle = '#ffffff';
        for(var i=0;i<l;++i) {
            for(var j=0;j<l;++j) {
                var idx = i*l+j;
                if(spin[idx]==-1 && spinBefore[idx]!=-1)
                    context.fillRect(j*(w+1),i*(w+1),w,w);
            }
        }
        for(var i=0;i<n;++i) spinBefore[i] = spin[i];
    }

    function updateSpin() {
        if(algorithm==0) heatBath();
        else if(algorithm==1) swendsenWang();
        else if(algorithm==2) wolff();
        else randomUpdate();
    }

    function heatBath() {
        interval = 40;
        // 1MCS update
        for(var k=0;k<n;++k) {
            var i = randomInt(0,n);
            var s0 = spin[i];
            var s1 = spin[(i+1)%n];
            var s2 = spin[(i-1+n)%n];
            var s3 = spin[(i+l)%n];
            var s4 = spin[(i-l+n)%n];
            var prob = 1.0/(1.0+Math.exp(2.0*s0*(s1+s2+s3+s4)/temp))
            if(Math.random()<prob) spin[i] = -s0;
        }
    }

    function swendsenWang() {
        interval = 100;
        var prob = 1.0-Math.exp(-2.0/temp);
        makeCluster(prob);
        for(var i=0;i<n;++i) {
            var root = cluster[i];
            if(i == root) {
                spin[i] = (Math.random()<0.5) ? 1 : -1;
            } else {
                spin[i] = spin[root];
            }
        }
    }

    function wolff() {
        interval = 100;
        var prob = 1.0-Math.exp(-2.0/temp);
        var count = 0;

        makeCluster(prob);
        while(count<n/5) {
            var updateCluster = cluster[randomInt(0,n)];
            for(var i=0;i<n;++i) {
                if(cluster[i] == updateCluster) {
                    spin[i] = -spin[i];
                    count++;
                }
            }
        }
    }

    function findRoot(i) {
        var child = i;
        var parent = cluster[child];
        while(child != parent) {
            child = parent;
            parent = cluster[child];
        }
        return child;
    }

    function connect(i,j) {
        var ri = findRoot(i);
        var rj = findRoot(j);
        var root = (ri<rj) ? ri : rj;
        var child = i;
        while(child != root) {
            var parent = cluster[child];
            cluster[child] = root;
            child = parent;
        }
        var child = j;
        while(child != root) {
            var parent = cluster[child];
            cluster[child] = root;
            child = parent;
        }
    }

    function makeCluster(prob) {
        for(var i=0;i<n;++i) cluster[i]=i;
        for(var i=0;i<n;++i) { // horizontal bonds
            var j = (i+1)%n;
            if(spin[i]==spin[j] && Math.random()<prob) connect(i,j);
        }
        for(var i=0;i<n;++i) { // vartical bonds
            var j = (i+l)%n;
            if(spin[i]==spin[j] && Math.random()<prob) connect(i,j);
        }
        for(var i=0;i<n;++i) {
            cluster[i] = findRoot(i);
        }
    }

    function randomInt(min,max) {
        return Math.floor(Math.random() * (max-min))+min;
    }

    function magnetization() {
        var m = 0.0;
        for(var i=0;i<n;++i) {
            m += spin[i];
        }
        return m/n;
    }

    function randomUpdate() {
        interval = 200;
        for(var i=0;i<n;++i) {
            if(Math.random()<0.5) spin[i] = 1;
            else spin[i] = -1;
        }
    }

    function update() {
        updateSpin();
        draw();
        graph.addPoint(temp,magnetization(),algorithm);
    }

    function loop() {
        var now = Date.now();
        if(now-basetime>interval) {
            basetime = now;
            update();
        }
        timerID = requestAnimationFrame(loop);
    }

    return {
        start: function() {
            if(!running) loop();
            running = true;
        },
        stop: function() {
            cancelAnimationFrame(timerID);
            running = false;
        },
        step: function() {
            cancelAnimationFrame(timerID);
            running = false;
            update();
        },
        setTemp: function(t) {temp=t;},
        setTempTc: function() {temp=tc;},
        getTemp: function() {return temp;},
        setAlgorithm: function(a) {algorithm=a;},
        getAlgorithm: function() {return algorithm;},
    }
}

function Graph() {
    var canvas = document.getElementById("graph");
    var context = canvas.getContext("2d");
    var offset = 7.5;
    var w = 11;
    var t_min = 0.5;
    var t_del = 0.1;

    var width = canvas.width = 400-1;
    var height = canvas.height = w*10+offset*2;

    reset();

    function x(t) {return w*(t-t_min)/t_del+offset;}
    function y(m) {return w*(1.0-m)/0.2+offset;}
    function t(x) {
        var t = t_del*(x-offset)/w+t_min;
        t = Math.round(t*100)/100;
        if(t<0.5) t=0.5;
        if(t>4.0) t=4.0;
        return t;
    }

    function addPoint(t,m,a) {
        if(a==0) context.fillStyle = "rgba(153,153,255,0.5)";
        else if(a==1) context.fillStyle = "rgba(153,255,153,0.5)";
        else if(a==2) context.fillStyle = "rgba(255,153,153,0.5)";
        else context.fillStyle = "rgba(255,255,255,0.5)";
        context.beginPath();
        context.arc( x(t), y(m), 2,0,2*Math.PI,true);
        context.fill();
    }

    function reset() {
        context.fillStyle = "#161616";
        context.fillRect(0,0,width,height)

        context.lineWidth = 1;

        context.strokeStyle = "#333333";
        for(var i=0;i<36;++i)  {
            context.beginPath();
            context.moveTo(offset+i*w, 0);
            context.lineTo(offset+i*w, height);
            context.stroke();
        }
        for(var i=0;i<11;++i) {
            context.beginPath();
            context.moveTo(0, offset+i*w);
            context.lineTo(width, offset+i*w);
            context.stroke();
        }

        context.strokeStyle = "#666666";
        for(var i=0;i<36;i+=5)  {
            context.beginPath();
            context.moveTo(offset+i*w, 0);
            context.lineTo(offset+i*w, height);
            context.stroke();
        }
        for(var i=0;i<11;i+=5) {
            context.beginPath();
            context.moveTo(0, offset+i*w);
            context.lineTo(width, offset+i*w);
            context.stroke();
        }

        context.strokeStyle = "#cccccc";
        context.beginPath();
        context.moveTo(0, height/2);
        context.lineTo(width, height/2);
        context.stroke();
    }

    return {
        addPoint: addPoint,
        reset: reset,
        getT: t
    }
}

var ising = Ising();
var graph = Graph();

$(function () {
    var initT = 2.27, timerID;

    function setT(t) {
        var t = Math.round(t*100)/100;
        $( "#temperature_value" ).text( t );
        ising.setTemp(t);
        $("#temperature").slider("setValue", t);
    }

    function rotateAlgorithm() {
        var a=ising.getAlgorithm();
        a = (a+1)%3;
        ising.setAlgorithm(a);
        $("#algorithm").selectpicker("val",a);
    }

    function cool() {
        var t = ising.getTemp();
        var dt = 0.1, interval = 1000;
        if(t>2.6) {
            dt = 0.1; interval = 1000;
        } else if(t>2.1) {
            dt = 0.05; interval = 4000;
        } else {
            dt = 0.1; interval = 1000;
        } 

        t = Math.round( (t-dt)*100 )/100;
        if (t<0.5) {
            t = 4.1;
            rotateAlgorithm();
        }

        setT(t);
        timerID = setTimeout(cool, interval);
        ising.start();
    }
    
    function stopCool() {
        clearTimeout(timerID);
        if ($("#auto").hasClass("active")) {
            $("#auto").button("toggle");
        }
    }

    var t_slider = $("#temperature").slider({
        min: 0.5,
        max: 4.0,
        step: 0.01,
        value: initT
    });

    t_slider.on("slide", function(e) {
        setT( e.value );
    });
    t_slider.prev().on("mouseup",function() {
        setT( t_slider.slider("getValue") );
    });

    $("#start").on("click", ising.start);
    $("#stop" ).on("click", function() {
        stopCool();
        ising.stop();
    });
    $("#step" ).on("click", function() {
        stopCool();
        ising.step();
    });

    $("#algorithm").on("change", function() {
        ising.setAlgorithm( $(this).val() );
    });

    $("#graph").on("click", function(e) {
        var x  = (e.offsetX || e.clientX - $(e.target).offset().left); // polyfill for firefox
        setT( graph.getT(x) );
    });

    $("#clear").on("click", graph.reset);

    $("#auto").on("click", function(e) {
        $(this).button("toggle");
        if($(this).hasClass("active")) {
            cool();
        } else {
            stopCool();
        }
    });

    setT(initT);
    ising.start();
});
