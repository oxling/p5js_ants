let EMPTY = 0;
//let ANT = 1; Unused. I never implemented collision.
let FOOD = 2;
let HOME = 3;
let WALL = 4;

let sim;

class SimulationVars {
	constructor() {
		this.lifespan = 1500;
		this.sight = 3;
		this.foodPheremoneDecay = 0.99;
		this.homePheremoneDecay = 0.99;
	}
}

class Cell {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.type = EMPTY;
		this.foodPheremone = 0;
		this.homePheremone = 0;
	}
}

class Ant {
	constructor(sim, x, y) {
		this.simulation = sim;
		this.x = x;
		this.y = y;
		this.steps = 0;
		//Angles are in increments of 45 degrees, clockwise, with 0 = north
		this.angle = 0;
		this.carryingFood = false;

		this.directions = [
			{x: 0, y: -1}, //N
			{x: 1, y: -1}, //NE
			{x: 1, y: 0}, //E
			{x: 1, y: 1}, //SE
			{x: 0, y: 1}, //S
			{x: -1, y:1}, //SW
			{x:-1, y:0}, //W,
			{x:-1, y:-1} //NW
			];
		}

		get lifespan() {
			return max(this.simulation.vars.lifespan, 1);
		}


		get isDead() {
			return this.steps > this.lifespan;
		}

		respawnAtCell(c) {
			this.x = c.x;
			this.y = c.y;
			this.randomizeDirection();
			this.steps = 0;
		}

		shouldRespawn() {
			return random(0, 1000) < 5;
		}

		turnLeft() {
			this.angle -= 1;
			if (this.angle < 0) {
				this.angle = this.directions.length - 1;
			}
		}
		
		turnRight() {
			this.angle += 1;
			this.angle = this.angle % this.directions.length;
		}


		forward() {
			let fwd = this.directions[this.angle];
			return fwd;
		}

		sensed() {
			let fwd = this.forward();
			var i=0;
			for (; i<this.directions.length; i++) {
				if (this.directions[i] == fwd) {
					break;
				}
			}
			
			
			let fwdLeft = this.directions[i > 0 ? i - 1 : this.directions.length - 1];
			let fwdRight = this.directions[(i + 1) % this.directions.length];
			
			return [fwdLeft, fwd, fwdRight];
		}

		walkRandomly() {
			let fwd = this.forward();
			let action = floor(random(0,6));
			  //Slightly more likely to move forwards than to turn
			  if (action < 4) {
			  	this.x += fwd.x;
			  	this.y += fwd.y;
			  } else if (action == 4) {
			  	this.turnLeft();
			  } else if (action == 5) {
			  	this.turnRight();
			  }
	}

	randomizeDirection() {
		this.angle = floor(random(0, this.directions.length));
	}

  //d is a direction {x, y}
  //isFood indicates if we're scoring for food or home
  getScoreForDirection(d, isFood) {
	//I keep meaning to sketch this out on graph paper - 
	//I'm certain I made a few logical errors in here.
	//However, I actually found this particular behavior (right or not)
	//worked pretty well, and my attempts at fixing it always made it worse!

	let range = this.simulation.vars.sight;
	
	let x0 = this.x + d.x*range;
	let y0 = this.y + d.y*range;
	let score = 0;
	for (var x = x0-range/2; x <= x0 + (range/2); x++) {
		for (var y = y0-(range/2); y <= y0 + (range/2); y++) {
			let c = this.simulation.getCell(round(x), round(y));
			var wScore = this.scoreForCell(c, isFood);
			
		wScore /= (dist(x0, y0, x, y) + 1); //This is the bit that's probably wrong
		score += wScore;
	}
}

let fwdCell = this.simulation.getCell(this.x + d.x, this.y + d.y);
score += this.scoreForCell(fwdCell, isFood);
return score;
}

scoreForCell(c, isFood) {
	if (c == null) {
		return 0;
	} else {
		if (isFood) {
			if (c.type == FOOD) {
				return 100;
			} else {
				return c.foodPheremone;
			}
		} else {
			if (c.type == HOME) {
				return 100;
			} else {
				return c.homePheremone;
			}
		}

	}

}

forageForFood() {
	this.seek(true);
}

lookForHome() {
	this.seek(false);
}


seek(isFood) {
	let sensed = this.sensed();
	
	let fwdLeft = sensed[0];
	let fwd = sensed[1];
	let fwdRight = sensed[2];
	
	var maxScore = 0;
	var bestDirection = fwd;
	
	var scores = [];
	
	for (var i=0; i<sensed.length; i++) {
		let direction = sensed[i];
		let score = this.getScoreForDirection(direction, isFood);
		scores[i] = score;
		if (score > maxScore) {
			maxScore = score;
			bestDirection = direction;
		}
	}
	
	
	
	
	//If no direction is particularly good, move at random.
	//There's also a 20% chance the ant moves randomly even 
	//if there is an optimal direction,
	//just to give them a little more interesting behavior.
	if (maxScore < 0.01 || random(1) < 0.2) {
		this.walkRandomly();
		return;
	}
	if (bestDirection == fwdRight) {
		this.turnRight();
	} else if (bestDirection == fwdLeft) {
		this.turnLeft();
	} else {
		this.x += fwd.x;
		this.y += fwd.y;
	}
	
}



}

class Simulation {
	constructor(w, h) {
		this.tick = 0;
		this.ants = [];
		this.cells = [];
		this.vars = new SimulationVars();

		for (var x=0; x<w; x++) {
			for (var y=0; y<h; y++) {
				let c = new Cell(y, x); //How did this happen?
				this.cells.push(c);
			}
		}

		let home = {x: floor(width/2), y: floor(width/2)};
		for (var x=home.x; x<=home.x + 5; x++) {
			for (var y=home.y; y<=home.y + 5; y++) {
				let c = this.getCell(x, y);
				c.type = HOME;
			}
		}

		this.home = this.getCell(home.x, home.y);
		this.home.type = HOME;

		this.foods = [];

		let food = {x: home.x+75, y: home.y+75};
		for (var x=food.x; x<=food.x + 5; x++) {
			for (var y=food.y; y<=food.y + 5; y++) {
				let c = this.getCell(x, y);
				c.type = FOOD;
				this.foods.push(c);
			}
		}


		for (var i=0; i<100; i++) {
			this.ants.push(new Ant(this, this.home.x, this.home.y))
		}
	}

	getCell(x, y) {
		if (x < 0 || x >= width) {
			return null;
		}
		if (y < 0 || y >= height) {
			return null;
		}

		return this.cells[x+y*width];
	}

	run() {
		this.tick++;

		for (var i=0; i<this.ants.length; i++) {
			let a = this.ants[i];
			let c = this.getCell(a.x, a.y);

			if (a.isDead) {
				if (a.shouldRespawn()) {
					a.respawnAtCell(this.home);
				}
				continue;
			}

			let sensed = a.sensed();
			let fwd = sensed[1];
			let fwdCell = this.getCell(a.x + fwd.x, a.y+fwd.y);
			
			if (fwdCell === null) {
				a.randomizeDirection();
				continue;
			}

			if (a.carryingFood) {
	 			//Look for home
	  			if (fwdCell.type == HOME) {
					//Drop food
					a.carryingFood = false;
		
					//Reset ttl
					a.steps = 0;

					//Turn around
					a.turnRight();
					a.turnRight();
					a.turnRight();
					a.turnRight();
					
					a.forageForFood();
		
			} else {
	   			a.lookForHome();
			}
		} else {
	  		//Look for food
	  		if (fwdCell.type == FOOD) {
				//Pick up food
				a.carryingFood = true;
				//Turn around
				a.turnRight();
				a.turnRight();
				a.turnRight();
				a.turnRight();
			
				//Reset TTL
				a.steps = 0;
			
				this.clearFood(fwdCell);
			
	   			a.lookForHome();

			} else {
				a.forageForFood();
			}
		}   

		if (!a.isDead && c.type == EMPTY && c.x != a.x && c.y != a.y ) {
			if (a.carryingFood) {
				c.foodPheremone += 1;
			} else {
				c.homePheremone += 1;
			}
		}

		a.steps++;
	}


	for (var i=0; i<this.cells.length; i++) {
		let c = this.cells[i];
    	if (c.foodPheremone > 0) {
      		c.foodPheremone *= this.vars.foodPheremoneDecay;
    	} 
    	if (c.homePheremone > 0) {
      		c.homePheremone *= this.vars.homePheremoneDecay;
      	}
    }

}

    addFood(x, y) {
    	let c = this.getCell(x, y);
    	if (c == null) {
    		return;
    	}
    	for (x = c.x - 2; x < c.x + 3; x++) {
    		for (y = c.y - 2; y < c.y + 3; y++) {
    			let nc = this.getCell(x, y);
    			if (nc != null && nc.type == EMPTY) {
					nc.type = FOOD;
    				this.foods.push(nc);
    			}
    		}
    	}
    }

    clearFood(c) {
    	c.type = EMPTY;
    	let idx = this.foods.indexOf(c);
    	if (idx != -1) {
    		this.foods.splice(idx, 1);
    	}
    }


draw() {

	let homeColor = color('#31536b');
	let foodColor = color('#75b8c8');
	let bgColor = color('#e6f5f2');

	background(bgColor);
	noStroke();


	fill(homeColor);
	ellipse(this.home.x, this.home.y, 5, 5);

	fill(foodColor);
	for (var i=0; i<this.foods.length; i++) {
		let f = this.foods[i];
		rect(f.x, f.y, 1, 1);
	}

    /*
    
    //This code draws the pheremone trails.
    //It's pretty but incredibly slow.

	for (var i=0; i<this.cells.length; i+=1) {
		let c = this.cells[i];
		if (c.type == EMPTY && c.homePheremone > 0 || c.foodPheremone > 0) {
      		let pheremoneColor = lerpColor(foodColor, homeColor, (c.homePheremone)/(c.homePheremone + c.foodPheremone));
      		let newColor = lerpColor(bgColor, pheremoneColor, norm(c.homePheremone + c.foodPheremone, 0, 50));
			fill(newColor);
			rect(c.x, c.y, 1, 1);
		} else if (c.type == FOOD) {
			fill(foodColor);
			rect(c.x, c.y, 1, 1);
		} else if (c.type == HOME) {
			fill(homeColor);
			rect(c.x, c.y, 1, 1);
		}
	} */

	for (var i=0; i<this.ants.length; i++) {
		let a = this.ants[i];
		var antColor = color('#000000');
		if (a.isDead) {
			antColor = color('#CCCCCC');
		} else if (a.carryingFood) {
			antColor = foodColor;
		} else {
			antColor = homeColor;
		}
		fill(antColor);
		rect(a.x, a.y, 2, 2);

	} 

}
}


function setup() {
	createCanvas(600, 600);
	frameRate(30);

	sim = new Simulation(width, height);
}

function draw() {


	sim.run();
	sim.draw();

}

function mouseClicked() {
	sim.addFood(round(mouseX), round(mouseY));
}

function touchEnded() {
	sim.addFood(round(mouseX), round(mouseY));
}


