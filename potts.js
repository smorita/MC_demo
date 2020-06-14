class Potts {
  constructor(Lx, Ly, Q, TTC, H) {
    this.Q = Q;
    this.TTC = TTC;
    this.H = H;
    this.resize(Lx, Ly);
  }

  resize(Lx, Ly) {
    this.Lx = Lx;
    this.Ly = Ly;
    this.N = Lx * Ly;
    console.log("Lx=", Lx, "Ly=", Ly, "N=", this.N);

    this.Spin = new Int8Array(this.N);
    this.NN0 = new Int32Array(this.N);
    this.NN1 = new Int32Array(this.N);
    this.NN2 = new Int32Array(this.N);
    this.NN3 = new Int32Array(this.N);

    this.Spin.forEach((val, idx) => {
      this.Spin[idx] = this.rand_int(this.Q);

      let x, y;
      [x, y] = this.get_coordinate(idx);
      this.NN0[idx] = this.get_index(x + 1, y);
      this.NN1[idx] = this.get_index(x, y + 1);
      this.NN2[idx] = this.get_index(x - 1, y);
      this.NN3[idx] = this.get_index(x, y - 1);
    });

    // For Swendsen-Wang algorithm
    this.Parent = new Int32Array(this.N);
  }

  tc() {
    return 1.0 / Math.log(Math.sqrt(this.Q) + 1.0);
  }

  rand_int(q) {
    return Math.floor(Math.random() * q) % q;
  }

  get_coordinate(i) {
    return [i % this.Lx, Math.floor(i / this.Lx)];
  }

  get_index(x, y) {
    x = (x + this.Lx) % this.Lx;
    y = (y + this.Ly) % this.Ly;
    return x + y * this.Lx;
  }

  update() {
    // this.swendsen_wang();
    this.heat_bath();
  }

  heat_bath() {
    const beta = 1.0 / (this.TTC * this.tc());
    const w = Math.exp(beta);
    const wh = Math.exp(beta * this.H);
    for (let i = 0; i < this.N; i += 2) {
      this.single_flip(i, w, wh);
    }
    for (let i = 1; i < this.N; i += 2) {
      this.single_flip(i, w, wh);
    }
  }

  single_flip(i, w, wh) {
    let prob = new Float64Array(this.Q);
    prob.fill(1.0);
    prob[this.Spin[this.NN0[i]]] *= w;
    prob[this.Spin[this.NN1[i]]] *= w;
    prob[this.Spin[this.NN2[i]]] *= w;
    prob[this.Spin[this.NN3[i]]] *= w;
    prob[0] *= wh;
    let sum = prob.reduce((p, c) => {return p + c;}, 0.0);
    let x = Math.random() * sum;
    let p = 0.0;
    for (let q = 0; q < this.Q; ++q) {
      p += prob[q];
      if (x < p) {
        this.Spin[i] = q;
        break;
      }
    }
  }

  ////////////////////////////////////////
  swendsen_wang() {
    const prob = 1.0 - Math.exp(-1.0 / (this.TTC * this.tc()));
    this.Parent.forEach((_, i) => {
      this.Parent[i] = i;
    });
    this.Spin.forEach((_, i) => {
      this.connect(i, this.NN0[i], prob);
      this.connect(i, this.NN1[i], prob);
    });
    this.Spin.forEach((_, i) => {
      let root = this.find(i);
      if (i == root) {
        this.Spin[i] = this.rand_int(this.Q);
      } else {
        this.Spin[i] = this.Spin[root];
      }
    });
  }

  find(i) {
    // Find with path splitting
    while (i != this.Parent[i]) {
      [i, this.Parent[i]] = [this.Parent[i], this.Parent[this.Parent[i]]];
    }
    return i;
  }

  unite(i, j) {
    // Unite by index
    i = this.find(i);
    j = this.find(j);
    if (i == j) {
      return;
    }
    if (i > j) {
      [i, j] = [j, i];
    }
    this.Parent[j] = i;
  }

  connect(i, j, prob) {
    if (this.Spin[i] == this.Spin[j] && Math.random() < prob) {
      this.unite(i, j);
    }
  }
}

class DrawPotts {
  constructor(id, full) {
    const q_min = 2;
    const q_max = 6;
    this.id = id;
    this.full = full;
    this.length = 4;

    this.stage = new createjs.StageGL(this.id);
    if (this.full) {
      this.stage.canvas.width = window.innerWidth;
      this.stage.canvas.height = window.innerHeight;
      this.stage.updateViewport(
        this.stage.canvas.width,
        this.stage.canvas.height
      );
    }

    this.stage.setClearColor("#ffffff");
    this.stage.update();

    let builder = new createjs.SpriteSheetBuilder();
    let rect = new createjs.Rectangle(0, 0, this.length, this.length);
    this.frame_number = [];
    for (let q = q_min; q <= q_max; ++q) {
      this.frame_number[q] = new Int32Array(q);
      for (let i = 0; i < q; ++i) {
        this.frame_number[q][i] = builder.addFrame(this.create_cell(q, i), rect);
      }
    }
    this.spriteSheet = builder.build();

    let cx = this.stage.canvas.width;
    let cy = this.stage.canvas.height;
    let Lx = Math.floor(cx / this.length) + 1;
    let Ly = Math.floor(cy / this.length) + 1;
    let N = Lx * Ly;

    this.potts = new Potts(Lx, Ly, 4, 1.0, 0.0);

    this.potts.Spin.forEach((c, i) => {
      let image = new createjs.Sprite(this.spriteSheet);
      image.gotoAndStop(this.frame_number[this.potts.Q][c]);
      this.stage.addChild(image);
      let x, y;
      [x, y] = this.potts.get_coordinate(i);
      image.x = this.length * x;
      image.y = this.length * y;
    })

    createjs.Ticker.framerate = 20;
    createjs.Ticker.addEventListener("tick", () => {
      this.update();
    });

    let states_slider = document.getElementById("states");
    if (states_slider != null) {
      let states_text = document.getElementById("states_text");
      states_slider.value = this.potts.Q;
      states_slider.addEventListener("input", (e) => {
        let q = Math.floor(e.target.value);
        this.potts.Q = q;
        states_text.innerText = q;
      });
    }

    let temp_slider = document.getElementById("temperature");
    if (temp_slider != null) {
      let temp_text = document.getElementById("temperature_text");
      temp_slider.value = this.potts.TTC;
      temp_slider.addEventListener("input", (e) => {
        this.potts.TTC = e.target.value;
        if (e.target.value == 1.0) {
          temp_text.innerText = "";
        } else {
          temp_text.innerText = e.target.value;
        }
      });
    }

    let field_slider = document.getElementById("field");
    if (field_slider != null) {
      let field_text = document.getElementById("field_text");
      field_slider.value = this.potts.H;
      field_slider.addEventListener("input", (e) => {
        this.potts.H = e.target.value;
        field_text.innerText = e.target.value;
      });
    }

    if (this.full) {
      this.timeoutID = 0;
      window.addEventListener("resize", () => {
        if (this.timeoutID) return;
        this.timeoutID = setTimeout(() => {
          this.timeoutID = 0;
          this.resize();
        }, 500);
      });
    }
  }

  create_cell(q, i) {
    const length = this.length;
    let hue = (360.0 / q) * i;
    const lw = 0.5;
    const color_spin = createjs.Graphics.getHSL(hue, 100, 72);
    const color_back = "#ffffff";
    let shape = new createjs.Shape();
    shape.graphics
      .ss(lw)
      .beginStroke(color_back)
      .beginFill(color_spin)
      .drawRect(0, 0, length, length);
    return shape;
  }

  draw() {
    this.potts.Spin.forEach((e, i) => {
      this.stage.children[i].gotoAndStop(this.frame_number[this.potts.Q][e]);
    });
    this.stage.update();
  }

  update() {
    this.draw();
    this.potts.update();
  }

  resize() {
    const cx = window.innerWidth;
    const cy = window.innerHeight;
    this.stage.canvas.width = cx;
    this.stage.canvas.height = cy;
    this.stage.updateViewport(cx, cy);
    const Lx = Number.parseInt(cx / this.length) + 1;
    const Ly = Number.parseInt(cy / this.length) + 1;
    const N = Lx * Ly;

    for (let i = this.stage.numChildren; i < N; ++i) {
      let image = new createjs.Sprite(this.spriteSheet);
      this.stage.addChildAt(image, i);
    }

    for (let i = N; i < this.stage.numChildren; ++i) {
      this.stage.children[i].visible = false;
    }

    this.potts.resize(Lx, Ly);
    this.potts.Spin.forEach((_, i) => {
      let x, y;
      [x, y] = this.potts.get_coordinate(i);
      this.stage.children[i].x = this.length * x;
      this.stage.children[i].y = this.length * y;
      this.stage.children[i].visible = true;
    });
  }
}

window.addEventListener("load", () => {
  new DrawPotts("potts", true);
});
