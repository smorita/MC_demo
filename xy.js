var model = function XY() {
    var PI2 = 2.0*Math.PI;
    var l = 100;
    var n = l*l;
    var temp = 1.0;
    var algorithm = 0;

    var running = false;
    var timerID;
    var basetime = 0;
    var interval = 200; // [msec]

    var w=3;
    var canvas = document.getElementById('model');
    var context = canvas.getContext('2d');
    canvas.width = canvas.height = l*(w+1)-1;
    var background_color = '#eeeeee';

    var color = color_hsv;
    var color_offset = 0.0;
    var show_vortex = true;
    var rotate_color = false;

    var spin = new Array(n);
    for(var i=0;i<n;++i) {
        spin[i] = Math.random();
    }

    var cluster = new Array(n);
    var isFlip = new Array(n);

    function color_red(val) {
        var x = Math.floor(val * 255);
        return "rgb(255, " + x + "," + x + ")";
    }

    function color_blue(val) {
        var x = Math.floor(val * 255)%256;
        return "rgb(" + x + "," + x + ", 255)";
    }

    function color_hsv(val) {
        var h = val;
        var s = 0.5;
        var v = 1.0;

        // convert HSV to RGB
        var r, g, b, i, f, p, q, t;
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
        }

        r = Math.floor(r * 255);
        g = Math.floor(g * 255);
        b = Math.floor(b * 255);
        return "rgb(" + r + "," + g + "," + b + ")";
    };

    function color_3color(val) {
        return color_hsv( Math.floor(val*3.0)/3.0 );
    }

    function draw_spin() {
        var x, y;
        for(var i=0;i<n;++i) {
            x = Math.floor(i%l);
            y = Math.floor(i/l);
            context.fillStyle = color(spin[i] + color_offset);
            context.fillRect(x*(w+1),y*(w+1),w,w);
        }
    }

    function draw_vortex() {
        function spin_diff(sa, sb) {
            var diff = sa-sb;
            if(diff>0.5) return diff-1.0;
            else if(diff<-0.5) return diff+1.0;
            else return diff;
        }
        var x, y;
        var s0, s1, s2, s3;
        var vortex;
        for(var i=0;i<n;++i) {
            x = Math.floor(i%l);
            y = Math.floor(i/l);
            if(x==l-1 || y==l-1) continue;

            s0 = spin[i];
            s1 = spin[(i+1)%n];
            s2 = spin[(i+1+l)%n];
            s3 = spin[(i+l)%n];

            vortex = spin_diff(s1,s0);
            vortex += spin_diff(s2,s1);
            vortex += spin_diff(s3,s2);
            vortex += spin_diff(s0,s3);

            if(vortex > 0.5) {
                context.fillStyle = "rgba(255,0,0,0.5)";
                context.fillRect(x*(w+1),y*(w+1),w+4,w+4);
            } else if(vortex < -0.5) {
                context.fillStyle = "rgba(0,0,0,0.5)";
                context.fillRect(x*(w+1),y*(w+1),w+4,w+4);
            }
        }
    }

    function shift_color() {
        color_offset -= 1.0/64.0;
        if(color_offset<0.0) color_offset=1.0;
    }

    function draw() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        draw_spin();
        if(show_vortex) draw_vortex();
        if(rotate_color) shift_color();
    }

    function updateSpin() {
        if(algorithm==0) heatBath();
        else if(algorithm==1) swendsenWang();
        else if(algorithm==2) wolff();
        // else randomUpdate();
        // randomUpdate();
        // heatBath();
    }

    function randomUpdate() {
        interval = 200;
        for(var i=0;i<n;++i) {
            spin[i] = Math.random();
        }
    }

    function heatBath() {
        interval = 40;
        // 1MCS update
        for(var k=0;k<n;++k) {
            var i = randomInt(0,n);
            var spin_new = Math.random();
            var s0_new = PI2*spin_new;
            var s0 = PI2*spin[i];
            var s1 = PI2*spin[(i+1)%n];
            var s2 = PI2*spin[(i-1+n)%n];
            var s3 = PI2*spin[(i+l)%n];
            var s4 = PI2*spin[(i-l+n)%n];
            var prob = Math.cos(s0-s1) + Math.cos(s0-s2) + Math.cos(s0-s3) + Math.cos(s0-s4);
            prob -= Math.cos(s0_new-s1) + Math.cos(s0_new-s2) + Math.cos(s0_new-s3) + Math.cos(s0_new-s4);
            prob = 1.0/(1.0+Math.exp(prob/temp));
            if(Math.random()<prob) spin[i] = spin_new;
        }
    }

    function swendsenWang() {
        interval = 200;
        var axes = Math.random();

        makeCluster(axes);

        for(var i=0;i<n;++i) {
            isFlip[i] = (Math.random()<0.5);
        }

        for(var i=0;i<n;++i) {
            var root = cluster[i];
            if(isFlip[root]) {
                spin[i] = flipped_spin(i, axes);
            }
        }
    }

    function wolff() {
        interval = 200;
        var axes = Math.random();
        var count = 0;

        makeCluster(axes);
        while(count<n/5) {
            var updateCluster = cluster[randomInt(0,n)];
            for(var i=0;i<n;++i) {
                if(cluster[i] == updateCluster) {
                    spin[i] = flipped_spin(i, axes);
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
        var child;
        var parent;

        child = i;
        while(child != root) {
            parent = cluster[child];
            cluster[child] = root;
            child = parent;
        }
        child = j;
        while(child != root) {
            parent = cluster[child];
            cluster[child] = root;
            child = parent;
        }
    }

    function makeCluster(axes) {
        var i, j;
        for(i=0;i<n;++i) cluster[i]=i;
        for(i=0;i<n;++i) { // horizontal bonds
            j = (i+1)%n;
            if(isConnect(i,j,axes)) connect(i,j);
        }
        for(i=0;i<n;++i) { // vartical bonds
            j = (i+l)%n;
            if(isConnect(i,j,axes)) connect(i,j);
        }
        for(i=0;i<n;++i) {
            cluster[i] = findRoot(i);
        }
    }

    function isConnect(i, j, axes) {
        var si = PI2*spin[i];
        var sj = PI2*spin[j];
        var sa = PI2*axes;
        var prob = 1.0-Math.exp(-2.0*Math.cos(si-sa)*Math.cos(sj-sa)/temp);
        return (Math.random()<prob);
    }

    function flipped_spin(i,axes) {
        s_new = 2.0*axes - spin[i] + 0.5;
        while(s_new>1.0) {
            s_new -= 1.0;
        }
        while(s_new<0.0) {
            s_new += 1.0;
        }
        return s_new;
    }

    function randomInt(min,max) {
        return Math.floor(Math.random() * (max-min))+min;
    }

    function update() {
        updateSpin();
        draw();
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
            draw();
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
        getTemp: function() {return temp;},
        setAlgorithm: function(a) {algorithm=a;},
        getAlgorithm: function() {return algorithm;},
        setColor: function(a) {
            if(a==0) color=color_hsv;
            else if(a==1) color=color_blue;
            else color=color_3color;
        },
        toggle_show_vortex: function() {
            show_vortex = !show_vortex;
        },
        toggle_rotate_color: function() {
            rotate_color = !rotate_color;
        }
    };
}();

$(function () {
    var initT=0.5;

    $("#start").on("click", model.start);
    $("#stop").on("click", model.stop);
    $("#step").on("click", model.step);

    var t_slider = $("#temperature").slider({
        min: 0.1,
        max: 1.5,
        step: 0.01,
        value: initT
    });

    function setT(t) {
        var t = Math.round(t*100)/100;
        $( "#temperature_value" ).text( t );
        model.setTemp(t);
        t_slider.slider("setValue", t);
    }

    t_slider.on("slide", function(e) {
        setT( e.value );
    });
    t_slider.prev().on("mouseup",function() {
        setT( t_slider.slider("getValue") );
    });

    $("#algorithm").on("change", function() {
        model.setAlgorithm( $(this).val() );
    });
    $("#color").on("change", function() {
        model.setColor( $(this).val() );
    });
    $("#show_vortex").on("click", function() {
        model.toggle_show_vortex();
        $(this).button("toggle");
    });
    $("#rotate_color").on("click", function() {
        model.toggle_rotate_color();
    });

    model.setTemp(initT);
    model.start();
});
