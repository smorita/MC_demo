class Ising {
  constructor(Lx, Ly, T) {
    this.T = T;
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
      this.Spin[idx] = Math.random() < 0.5 ? 1 : -1;

      let x, y;
      [x, y] = this.get_coordinate(idx);
      this.NN0[idx] = this.get_index(x + 1, y);
      this.NN1[idx] = this.get_index(x, y + 1);
      this.NN2[idx] = this.get_index(x - 1, y);
      this.NN3[idx] = this.get_index(x, y - 1);
    });

    // For Swendsen-Wang algorithm
    this.Parent = new Int32Array(this.N);

    // For Swendsen-Wang algorithm
    this.Stack = new Array();
  }

  get_coordinate(i) {
    return [i % this.Lx, Math.floor(i / this.Lx)];
  }

  get_index(x, y) {
    x = (x + this.Lx) % this.Lx;
    y = (y + this.Ly) % this.Ly;
    return x + y * this.Lx;
  }

  is_up(i) {
    return this.Spin[i] > 0;
  }

  update(i) {
    if (i == 1) {
      this.swendsen_wang();
    } else if (i == 2) {
      this.wolff();
    } else {
      this.heat_bath();
    }
  }

  ////////////////////////////////////////
  heat_bath() {
    for (let i = 0; i < this.N; i += 2) {
      this.single_flip(i);
    }
    for (let i = 1; i < this.N; i += 2) {
      this.single_flip(i);
    }
  }

  single_flip(i) {
    let s = this.Spin[i];
    let s_nn =
      this.Spin[this.NN0[i]] +
      this.Spin[this.NN1[i]] +
      this.Spin[this.NN2[i]] +
      this.Spin[this.NN3[i]];
    let prob = 1.0 / (1.0 + Math.exp((2.0 * s * s_nn) / this.T));
    if (Math.random() < prob) {
      this.Spin[i] *= -1;
    }
  }

  ////////////////////////////////////////
  swendsen_wang() {
    const prob = 1.0 - Math.exp(-2.0 / this.T);
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
        this.Spin[i] = Math.random() < 0.5 ? 1 : -1;
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

  ////////////////////////////////////////
  wolff() {
    let count = 0;

    // This implementation is only for visualization.
    // In the Wolff algorithm, we need to measure the average size of a cluster
    // and determine the number of flips in one Monte Carlo step.
    while (count < this.N / 5) {
      count += this.flip_cluster();
    }
  }

  flip_cluster() {
    const prob = 1.0 - Math.exp(-2.0 / this.T);
    let i = Math.floor(Math.random() * this.N) % this.N;
    const s = this.Spin[i];
    let count = 1;
    this.Spin[i] *= -1;
    this.Stack.push(i);

    while (this.Stack.length > 0) {
      i = this.Stack.pop();
      [this.NN0[i], this.NN1[i], this.NN2[i], this.NN3[i]].forEach((j) => {
        if (s == this.Spin[j] && Math.random() < prob) {
          count++;
          this.Spin[j] *= -1;
          this.Stack.push(j);
        }
      });
    }

    return count;
  }
}

class DrawIsing {
  constructor(id, full) {
    this.id = id;
    this.full = full;

    const color_back = "#ffffff";
    const color_spin = "#6191f2";
    const lw = 0.2;
    const length = 4;
    let shape = new createjs.Shape();
    shape.graphics
      .ss(lw)
      .beginStroke(color_back)
      .beginFill(color_spin)
      .drawRect(0, 0, length, length);
    shape.cache(0, 0, length, length);
    this.cell_image = shape.cacheCanvas;
    this.length = length;
    
    this.stage = new createjs.StageGL(this.id);
    if (this.full) {
      this.stage.canvas.width = window.innerWidth;
      this.stage.canvas.height = window.innerHeight;
      this.stage.updateViewport(
        this.stage.canvas.width,
        this.stage.canvas.height
      );
    }

    this.stage.setClearColor(color_back);
    this.stage.update();

    let cx = this.stage.canvas.width;
    let cy = this.stage.canvas.height;
    let Lx = Math.floor(cx / this.length) + 1;
    let Ly = Math.floor(cy / this.length) + 1;
    let N = Lx * Ly;

    this.ising = new Ising(Lx, Ly, 2.27);
    this.algorithm = 0;
    this.framerate = [20, 5, 5];

    this.ising.Spin.forEach((_, i) => {
      let image = new createjs.Bitmap(this.cell_image);
      this.stage.addChild(image);
      let x, y;
      [x, y] = this.ising.get_coordinate(i);
      image.x = this.length * x;
      image.y = this.length * y;
    })

    createjs.Ticker.framerate = this.framerate[this.algorithm];
    createjs.Ticker.addEventListener("tick", () => {
      this.update();
    });

    let slider = document.getElementById("temperature");
    if (slider != null) {
      let temp_text = document.getElementById("temperature_text");
      slider.value = this.ising.T;
      slider.addEventListener("input", (e) => {
        this.ising.T = e.target.value;
        temp_text.innerText = e.target.value;
      });
    }

    let select_algorithm = document.getElementById("algorithm");
    if (select_algorithm != null) {
      select_algorithm.addEventListener("input", (e) => {
        this.change_algorithm(e.target.value);
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

  draw() {
    this.ising.Spin.forEach((e, i) => {
      this.stage.children[i].visible = this.ising.is_up(i);
    });
    this.stage.update();
  }

  update() {
    this.draw();
    this.ising.update(this.algorithm);
  }

  change_algorithm(i) {
    this.algorithm = i;
    createjs.Ticker.framerate = this.framerate[i];
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
      let image = new createjs.Bitmap(this.cell_image);
      this.stage.addChildAt(image, i);
    }
    this.stage.children.forEach((e) => {
      e.visible = false;
    });

    this.ising.resize(Lx, Ly);
    this.ising.Spin.forEach((_, i) => {
      let x, y;
      [x, y] = this.ising.get_coordinate(i);
      this.stage.children[i].x = this.length * x;
      this.stage.children[i].y = this.length * y;
    });
  }
}

window.addEventListener("load", () => {
  new DrawIsing("ising", true);
});
