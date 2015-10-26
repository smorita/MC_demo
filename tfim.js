var model = function tfim() {
    var n_spin = 100;
    var temp = 0.1;
    var gamma = 1.0;

    var spin = new Array(n_spin);
    var wall = new Array(n_spin);
    for(var i=0;i<n_spin;++i) {
        spin[i] = (Math.random()<0.5) ? 1 : -1;
        wall[i] = init_wall();
    }

    function exp_dist(theta) {
        if(theta>0.0) {
            return Math.abs(Math.log(1.0-Math.random())*theta);
        } else {
            return Number.MAX_VALUE;
        }
    };

    function make_wall() {
        var theta = temp/gamma;
        var pos = exp_dist(theta);
        var width;
        var wall = new Array();
        while(pos<1.0) {
            width = exp_dist(theta);
            wall.push(pos);
            pos += width;
        };
        return wall;
    }

    function init_wall() {
        var wall = make_wall();
        if(wall.length%2>0) wall.pop();
        wall.push(1.0);
        return wall;
    }

    function create_cluster(idx) {
        var w0 = wall[idx];
        var w1 = make_wall();
        w1.push(1.0);

        var x0, x1;
        var x = 0.0;
        var i0 = 0;
        var i1 = 0;
        var w = new Array();
        while(x<1.0) {
            x0 = w0[i0];
            x1 = w1[i1];
            if(x0<x1) {
                x = x0;
                i0 += 1;
            } else {
                x = x1;
                i1 += 1;
            }
            w.push(x);
        }
        var spin = new Array(w.length);
        var ene = new Array(w.length);
        for(var i=0;i<ene.length;++i) ene[i] = 0.0;

        return {
            num: w.length,
            wall: w,
            spin: spin,
            ene: ene
        };
    }

    function add_ene(cluster,idx) {
        var w1 = wall[idx];
        var i1 = 0;
        var x1 = w1[i1++];
        var s1 = spin[idx];

        var bottom=0.0, top=0.0;
        for(i=0;i<cluster.num;++i) {
            top = cluster.wall[i];

            while(x1<top) {
                cluster.ene[i] += s1*(x1-bottom);
                bottom = x1;
                x1 = w1[i1++];
                s1 *= -1;
            }
            cluster.ene[i] += s1*(top-bottom);
            bottom = top;
        }
    }

    function prob(e) {
        return 1.0/(1.0+Math.exp(-2.0*e/temp));
    }

    function flip_cluster(cluster) {
        var p;
        if(cluster.num==1) {
            p = prob(cluster.ene[0]);
        } else {
            p = prob(cluster.ene[0] + cluster.ene[cluster.num-1]);
        }
        cluster.spin[0] = (Math.random()<p) ? +1 : -1;
        cluster.spin[cluster.num-1] = cluster.spin[0];

        for(i=1;i<cluster.num-1;++i) {
            p = prob(cluster.ene[i]);
            cluster.spin[i] = (Math.random()<p) ? +1 : -1;
        }
    }

    function update_spin(idx) {
        var cluster = create_cluster(idx);
        add_ene(cluster, (idx+1)%n_spin);
        add_ene(cluster, (idx-1+n_spin)%n_spin);
        flip_cluster(cluster);

        spin[idx] = cluster.spin[0];
        wall[idx] = new Array();
        for(i=0;i<cluster.num-1;++i) {
            if(cluster.spin[i] != cluster.spin[i+1]) {
                wall[idx].push(cluster.wall[i]);
            }
        }
        wall[idx].push(1.0);
    }

    function update() {
        for(var i=0;i<n_spin;++i) {
            var idx = Math.floor(Math.random()*n_spin);
            update_spin(idx);
        }
    }

    return {
        get_n: function() {return n_spin;},
        get_spin: function(i) {return spin[i];},
        get_wall: function(i) {return wall[i];},

        set_temp: function(t) {temp = t;},
        get_temp: function() {return temp;},

        set_gamma: function(g) {gamma = g;},
        get_gamma: function() {return gamma;},

        update: update
    };
}();

var view = function () {
    var l = model.get_n();
    var w = (400/l)-1;
    var y = 400;

    var running = false;
    var timerID;
    var basetime = 0;
    var interval = 50; // [msec]

    var canvas = document.getElementById('model');
    var context = canvas.getContext('2d');
    canvas.width = l*(w+1)-1;
    canvas.height = y;
    var background_color = '#eeeeee';

    function draw() {
        var color = ['#3366cc','#ffffff'];
        var spin, wall, y0, y1;
        for(var i=0;i<l;++i) {
            spin = model.get_spin(i);
            wall = model.get_wall(i);
            context.fillStyle = (spin>0) ? color[0] : color[1];
            context.fillRect(i*(w+1),0,w,y);
            context.fillStyle = (spin>0) ? color[1] : color[0];
            for(var j=0;j<wall.length;j+=2) {
                y0 = wall[j]*y;
                y1 = wall[j+1]*y;
                context.fillRect(i*(w+1),y0,w,y1-y0);
            }
        }
    };

    function update() {
        model.update();
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

    function start() {
        if(!running) loop();
        running = true;
    }

    function stop() {
        cancelAnimationFrame(timerID);
        running = false;
    }

    function step() {
        stop();
        update();
    }

    return {
        start: function() {start();},
        stop: function() {stop();},
        step: function() {step();}
    };
}();

$(function () {
    $("#start").on("click", view.start);
    $("#stop").on("click", view.stop);
    $("#step").on("click", view.step);

    var t_slider = $("#temp_slider").slider({
        min: 0.01,
        max: 0.5,
        step: 0.01,
        value: model.get_temp()
    });

    function set_temp(temp) {
        var t = Math.round(temp*100)/100;
        $( "#temp_value" ).text( t );
        model.set_temp(t);
        t_slider.slider("setValue", t);
    }

    t_slider.on("slide", function(e) {
        set_temp( e.value );
    });
    t_slider.prev().on("mouseup",function() {
        set_temp( t_slider.slider("getValue") );
    });

    var g_slider = $("#gamma_slider").slider({
        min: 0.0,
        max: 2.0,
        step: 0.01,
        value: model.get_gamma()
    });

    function set_gamma(gamma) {
        var g = Math.round(gamma*100)/100;
        $( "#gamma_value" ).text( g );
        model.set_gamma(g);
        g_slider.slider("setValue", g);
    }

    g_slider.on("slide", function(e) {
        set_gamma( e.value );
    });
    g_slider.prev().on("mouseup",function() {
        set_gamma( g_slider.slider("getValue") );
    });


    view.start();
});
