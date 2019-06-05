/******************************************************************************
 * EE Calc                                                                    *
 *                                                                            *
 * Copyright (C) 2019 J.C. Fields (jcfields@jcfields.dev).                    *
 *                                                                            *
 * Permission is hereby granted, free of charge, to any person obtaining a    *
 * copy of this software and associated documentation files (the "Software"), *
 * to deal in the Software without restriction, including without limitation  *
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,   *
 * and/or sell copies of the Software, and to permit persons to whom the      *
 * Software is furnished to do so, subject to the following conditions:       *
 *                                                                            *
 * The above copyright notice and this permission notice shall be included in *
 * all copies or substantial portions of the Software.                        *
 *                                                                            *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR *
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,   *
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL    *
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER *
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING    *
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER        *
 * DEALINGS IN THE SOFTWARE.                                                  *
 ******************************************************************************/

"use strict";

/*
 * constants
 */

const CONSTANTS = [
	{
		symbol: "ω",
		title:  "Angular Frequency of 60 Hz (in rad/s)",
		value:  Decimal.mul(Math.PI, 60).times(2)
	}, {
		symbol: "*q*_e",
		title:  "Elementary Charge (in C)",
		value:  Decimal.pow(10, -19).times(1.602176634)
	}, {
		symbol: "*k*_e",
		title:  "Coulomb’s Constant (in N·m²/C²)",
		value:  Decimal.pow(10, 9).times(8.9875517873681764)
	}, {
		symbol: "ε_0",
		title:  "Electrical Permittivity of Free Space (in F/m)",
		value:  Decimal.div(625000, Decimal.mul(22468879468420441, Math.PI))
	}, {
		symbol: "μ_0",
		title:  "Magnetic Permeability of Free Space (in H/m)",
		value:  Decimal.pow(10, -7).times(4).times(Math.PI)
	}, {
		symbol: "φ_0",
		title:  "Magnetic Flux Quantum (in Wb)",
		value:  Decimal.pow(10, -15).times(2.067833848)
	}, {
		symbol: "*G*_0",
		title:  "Conductance Quantum (in S)",
		value:  Decimal.pow(10, -5).times(7.74809172986365064668)
	}, {
		symbol: "*Z*_0",
		title:  "Characteristic Impedance of Vacuum (in Ω)",
		value:  Decimal.pow(10, -7).times(4).times(Math.PI).times(299792458)
	}, {
		symbol: "π",
		title:  "Pi [P]",
		value:  Math.PI
	}
];

// modes
const DEC  = true, INT   = false; // decimal input
const ON   = true, OFF   = false; // exponential notation
const REAL = true, IMAG  = false; // real/imaginary input
const MAG  = true, PHASE = false; // magnitude/phase input
const DEG  = true, RAD   = false; // angle mode
const RECT = true, POLAR = false; // rectangular/polar form

// operations
const STACK = 0, UNARY = 1, BINARY = 2;

// input/output settings
const MAX_LENGTH = 50;
const PRECISION = {
	2:  12,
	8:  20,
	10: 20,
	16: 20
};
const MAX_DIGITS = {
	2:  16,
	8:  12,
	10: 15,
	16: 12
};
const GROUPING_SIZE = {
	2:  4,
	8:  3,
	10: 3,
	16: 2
};

// captions
const CONSTANT_CAPTION = "Left-click to Insert\nRight-click to Edit";
const MEMORY_CAPTION = "Left-click to Recall\nRight-click to Remove";

// objects
const stack   = new Stack();
const display = new Display();

/*
 * initialization
 */

window.addEventListener("load", function() {
	const store = new Storage("eecalc", {display, stack});
	store.load();

	stack.loadConstants();
	display.updateConstants();

	window.addEventListener("beforeunload", function() {
		store.save();
	});
	window.addEventListener("keydown", function(event) {
		const keyCode = event.keyCode;

		// ignores most key events if overlay is open (unless pinned)
		if (display.overlay != "") {
			if (keyCode == 27) { // escape
				display.closeOverlays();
			}

			// T or Y closes tape or stack
			if (display.overlay == "tape" && (keyCode == 84 || keyCode == 89)) {
				display.closeOverlays();
			}

			return;
		}

		if (keyCode == 8) { // backspace
			event.preventDefault();

			if (event.shiftKey) {
				stack.stackOp("drop");
			} else {
				stack.stackOp("backspace");
			}
		}

		if (keyCode == 9) { // tab
			event.preventDefault();
			stack.rotateMemory(event.shiftKey);
		}

		if (keyCode == 13) { // enter
			stack.newLine();
		}

		if (keyCode == 18) { // alt/opt
			stack.setAlt(true);
		}

		if (keyCode == 27) { // escape
			if (event.altKey || event.shiftKey) {
				stack.clearAll();
			} else {
				stack.clear();
			}
		}

		if (keyCode == 37 || keyCode == 39) { // left or right arrow
			stack.stackOp("swap");
		}

		if (keyCode == 40) { // down arrow
			stack.stackOp("roll");
		}

		if (keyCode == 46) { // del
			stack.stackOp("drop");
		}

		if ((keyCode >= 48 && keyCode <= 57) && !event.shiftKey) { // num row
			stack.type(keyCode - 48);
		}

		if (keyCode == 49 && event.shiftKey) { // factorial (!)
			stack.unaryOp("factorial");
		}

		if (keyCode == 50 && event.shiftKey) { // square (@)
			stack.unaryOp("square");
		}

		if (keyCode == 52 && event.shiftKey) { // square root ($)
			stack.unaryOp("sqrt");
		}

		if (keyCode == 53 && event.shiftKey) { // percentage (%)
			stack.binaryOp("percentage");
		}

		if (keyCode == 54 && event.shiftKey) { // power (^)
			stack.binaryOp("power");
		}

		if ((keyCode == 56 && event.shiftKey) || keyCode == 106) { // mult (*)
			stack.binaryOp("multiply");
		}

		if ((keyCode == 61 && event.shiftKey) || keyCode == 107) { // add (+)
			stack.binaryOp("add");
		}

		if (keyCode >= 65 && keyCode <= 70) { // A-F
			stack.type(keyCode - 55);
		}

		if (keyCode == 69) { // E
			stack.toggleExpNotation();
		}

		if (keyCode == 73 || keyCode == 74) { // i or j
			stack.toggleImagInput();
		}

		if (keyCode == 80) { // P
			stack.insertNumber(Math.PI);
		}

		if (keyCode == 82 && event.shiftKey) { // shift+R
			stack.stackOp("recall");
		}

		if (keyCode == 83) { // S
			stack.stackOp("negate");
		}

		if (keyCode == 84) { // T
			display.toggleTape("tape");
		}

		if (keyCode == 83 && event.shiftKey) { // shift+S
			stack.stackOp("store");
		}

		if (keyCode == 89) { // Y
			display.toggleTape("stack");
		}

		if (keyCode == 90 && (event.ctrlKey ^ event.metaKey)) { // Ctrl+Z/Cmd+Z
			stack.undo();
		}

		if (keyCode >= 96 && keyCode <= 105) { // num pad
			stack.type(keyCode - 96);
		}

		if (keyCode == 109 || keyCode == 173) { // subtract (-)
			stack.binaryOp("subtract");
		}

		if (keyCode == 110 || keyCode == 190) { // decimal (.)
			stack.toggleDecInput();
		}

		if (keyCode == 111 || keyCode == 191) { // divide (/)
			event.preventDefault(); // hotkey for inline search in Firefox
			stack.binaryOp("divide");
		}

		if (keyCode == 192) { // backtick
			event.preventDefault();
			display.rotateBase(event.shiftKey);
		}

		if (keyCode == 220) { // backslash
			stack.unaryOp("invert");
		}
	});
	window.addEventListener("keyup", function(event) {
		const keyCode = event.keyCode;

		if (keyCode == 18) { // alt/opt
			stack.setAlt(false);
		}
	});

	document.addEventListener("click", function(event) {
		const element = event.target;

		// necessary to prevent button-sticking in Chrome
		if (element.matches("button")) {
			element.blur();
		}

		if (element.closest("#deg")) {
			stack.toggleAngleMode();
		}

		if (element.closest("#rect")) {
			stack.toggleImagDisplay();
		}

		if (element.closest("#imag")) {
			stack.toggleImagInput();
		}

		if (element.matches("#ee")) {
			stack.toggleExpNotation();
		}

		if (element.matches("#undo")) {
			stack.undo();
		}

		if (element.matches("#pin")) {
			display.pin(element.value);
		}

		if (element.matches("#save")) {
			stack.editConstant(
				element.value,
				$("#symbol").value,
				$("#title").value
			);
			display.toggleOverlay($("#constant"));
		}

		if (element.matches("#reset")) {
			stack.resetConstant($("#save").value);
			display.toggleOverlay($("#constant"));
		}

		if (element.matches("#bank button")) {
			stack.recall(element.value);
		}

		if (element.closest(".unary")) {
			stack.unaryOp(element.closest(".unary").value);
		}

		if (element.closest(".binary")) {
			stack.binaryOp(element.closest(".binary").value);
		}

		if (element.closest(".constant")) {
			stack.insertConstant(Number(element.closest(".constant").value));
		}

		if (element.matches(".number")) {
			stack.type(Number(element.value));
		}

		if (element.matches(".stack")) {
			stack.stackOp(element.value);
		}

		if (element.matches(".base")) {
			display.setBase(Number(element.value));
		}

		if (element.matches(".tape")) {
			display.toggleTape(element.value);
		}

		if (element.matches(".close")) {
			display.closeOverlays();
		}
	});
	document.addEventListener("contextmenu", function(event) {
		const element = event.target;

		if (element.matches("#bank button")) {
			event.preventDefault();
			stack.remove(element.value);
		}

		if (element.closest(".constant")) {
			event.preventDefault();

			const value = Number(element.closest(".constant").value);
			display.openConstantEditor(value);
			display.toggleOverlay($("#constant"));
		}
	});
});

function $(selector) {
	return document.querySelector(selector);
}

function $$(selector) {
	return Array.from(document.querySelectorAll(selector));
}

/*
 * ComplexNumber prototype
 */

function ComplexNumber(obj={}) {
	if (obj.real != undefined || obj.imag != undefined) {
		this.real = Decimal(obj.real || 0);
		this.imag = Decimal(obj.imag || 0);

		// since this block is executed when the stack/memory/constants are
		// loaded from storage, any of these values may already be defined

		if (obj.mag == undefined) {
			this.mag = this.real.toPower(2).plus(this.imag.toPower(2)).sqrt();
		} else {
			this.mag = Decimal(obj.mag);
		}

		if (obj.phase == undefined) {
			this.phase = Decimal.atan2(this.imag, this.real);
		} else {
			this.phase = Decimal(obj.phase);
		}

		if (obj.deg == undefined) {
			this.deg = this.convertToRad(this.phase);
		} else {
			this.deg = Decimal(obj.deg);
		}
	} else if (obj.mag != undefined) {
		if (obj.mode == undefined) {
			obj.mode = RAD;
		}

		// defines phase as rad in terms of deg or deg in terms of rad to ensure
		// the accuracy of whichever was inputted by the user
		if (obj.mode == RAD) {
			this.phase = Decimal(obj.phase || 0);
			this.deg   = this.convertToRad(this.phase);
		} else {
			this.deg   = Decimal(obj.deg || 0);
			this.phase = this.convertToDeg(this.deg);
		}

		this.mag  = Decimal(obj.mag || 0);
		this.real = this.mag.times(this.phase.cos());
		this.imag = this.mag.times(this.phase.sin());
	} else { // defaults when created with no argument
		this.real = Decimal(0);
		this.imag = Decimal(0);

		this.mag   = Decimal(0);
		this.phase = Decimal(0);
		this.deg   = Decimal(0);
	}

	// prevents infinitesimal real values for imaginary numbers
	if (this.deg.equals(90)) {
		this.real = Decimal(0);
	}

	// prevents infinitesimal imaginary values for negative real numbers
	if (this.deg.equals(180)) {
		this.imag = Decimal(0);
	}
}

ComplexNumber.prototype.display = function(editing=false) {
	if (this.real.isNaN() || this.imag.isNaN()) {
		throw "Not a Number";
	}

	if (!this.real.isFinite() || !this.imag.isFinite()) {
		throw "Infinity";
	}

	if (this.real.isZero() && this.imag.isZero()) {
		if (editing) { // number is still being edited
			if (stack.imagInput == REAL) {
				if (stack.decInput == INT) {
					return "0";
				} else {
					// allows typing sequence of zeros
					// when number starts with zero
					return "0." + "0".repeat(stack.zeros);
				}
			} else if (stack.imagDisplay == RECT) {
				// user starts inputting imaginary with no real component
				return "j";
			}
		} else {
			return "0";
		}
	}

	const disp = stack.imagDisplay == RECT
	           ? displayRect.call(this)
	           : displayPolar.call(this);

	// overflow error if output is too long
	return disp.length > MAX_LENGTH ? "Overflow" : disp;

	function displayRect() {
		let str = "";

		if (!this.real.isZero()) {
			str += output(this.real);

			if (this.real.isNegative()) {
				str = "−" + str;
			}
		}

		if (!this.imag.isZero() || stack.imagInput == IMAG) {
			if (this.imag.isNegative()) {
				str += " − j";
			} else {
				str += this.real.toNumber() ? " + j" : "j";
			}
		}

		if (!this.imag.isZero()) {
			str += output(this.imag);
		}

		return str;
	}

	function displayPolar() {
		const phase = stack.angleMode == RAD ? this.phase : this.deg;
		let str = "";

		if (!this.mag.isZero()) {
			str += output(this.mag);

			if (this.mag.isNegative()) {
				str = "−" + str;
			}
		} else {
			str += "0";
		}

		if (!phase.isZero() || stack.imagInput == PHASE) {
			str += " ∠ ";

			if (phase.isNegative()) {
				str += "−";
			}
		}

		if (!phase.isZero()) {
			str += output(phase);
			str += stack.angleMode == RAD ? " rad" : "°";
		}

		return str;
	}

	function output(num) {
		let str = "";

		if (display.base == 10) {
			if (num.toString().search("e") == -1) { // no exponential
				// toLocaleString() inserts commas as separators
				str += num.abs().toNumber().toLocaleString("en-US", {
					maximumFractionDigits: 20
				});
			} else { // replaces hyphen with minus
				str += num.abs().toExponential().replace("-", "−");
			}
		} else {
			// Decimal version of toString() does not support radix
			str += num.abs().toNumber().toString(display.base).toUpperCase();
			str = group(str);
		}

		if (stack.decInput == DEC) {
			// allows typing sequence of zeros when number starts with non-zero
			if (num.isInteger()) {
				str += ".";
			}

			str += "0".repeat(stack.zeros);
		}

		return str;
	}

	function group(str) {
		const size = GROUPING_SIZE[display.base];
		let [originalInt, originalDec] = str.split(".");
		let newInt = "", newDec = "";

		// groups integer part with incomplete groups at front of number
		for (let i = 0; i < originalInt.length; i++) {
			newInt = originalInt[originalInt.length - i - 1] + newInt;

			if (i != originalInt.length - 1 && (i + 1) % size == 0) {
				newInt = " " + newInt;
			}
		}

		if (originalDec != undefined) {
			// truncates fractional part to certain precision depending on base
			if (originalDec.length > PRECISION[display.base]) {
				originalDec = originalDec.slice(0, PRECISION[display.base]);
			}

			// groups decimal part with incomplete groups at end of number
			for (let i = 0; i < originalDec.length; i++) {
				newDec += originalDec[i];

				if ((i + 1) % size == 0) {
					newDec += " ";
				}
			}

			return newInt + "." + newDec;
		}

		return newInt;
	}
};

ComplexNumber.prototype.angle = function() {
	if (stack.angleMode == DEG && this.imag.isZero()) {
		return new ComplexNumber({real: this.convertToDeg(this.real)});
	}

	return this; // radians used by default
};

ComplexNumber.prototype.arcAngle = function() {
	if (stack.angleMode == DEG && this.imag.isZero()) {
		return new ComplexNumber({real: this.convertToRad(this.real)});
	}

	return this; // radians used by default
};

ComplexNumber.prototype.convertToDeg = function(rad) {
	return rad.times(Math.PI).dividedBy(180);
};

ComplexNumber.prototype.convertToRad = function(deg) {
	return deg.times(180).dividedBy(Math.PI);
};

ComplexNumber.prototype.add = function(y) {
	return new ComplexNumber({
		real: y.real.plus(this.real),
		imag: y.imag.plus(this.imag)
	});
};

ComplexNumber.prototype.subtract = function(y) { // y - x
	return new ComplexNumber({
		real: y.real.minus(this.real),
		imag: y.imag.minus(this.imag)
	});
};

ComplexNumber.prototype.multiply = function(y) {
	let z = null;

	if (this.imag.isZero() && y.imag.isZero()) { // real
		z = new ComplexNumber({real: y.real.times(this.real)});
	} else { // complex
		z = new ComplexNumber({
			mag:   y.mag.times(this.mag),
			phase: y.phase.plus(this.phase)
		});
	}

	return z;
};

ComplexNumber.prototype.divide = function(y) { // y / x
	if (this.mag.isZero()) { // divide by zero
		throw "Infinity";
	}

	let z = null;

	if (this.imag.isZero() && y.imag.isZero()) { // real
		z = new ComplexNumber({real: y.real.dividedBy(this.real)});
	} else { // complex
		z = new ComplexNumber({
			mag:   y.mag.dividedBy(this.mag),
			phase: y.phase.minus(this.phase)
		});
	}

	return z;
};

ComplexNumber.prototype.invert = function() { // 1 / x
	if (this.mag.isZero()) { // divide by zero
		throw "Infinity";
	}

	let z = null;

	if (this.imag.isZero()) { // real
		z = new ComplexNumber({real: Decimal.div(1, this.real)});
	} else { // complex
		const real = Decimal.div(1, this.mag).times(this.phase.neg().cos());
		const imag = Decimal.div(1, this.mag).times(this.phase.neg().sin());

		z = new ComplexNumber({real, imag});
	}

	return z;
};

ComplexNumber.prototype.square = function() {
	let z = null;

	if (this.imag.isZero()) { // real
		z = new ComplexNumber({real: this.real.pow(2)});
	} else { // complex
		// special case when real and imag components are equal
		// prevents infinitesimal real value when solution should be imaginary
		if (this.real.equals(this.imag)) {
			z = new ComplexNumber({imag: this.imag.pow(2).times(2)});
		} else {
			z = new ComplexNumber({real: 2}).power(this);
		}
	}

	return z;
};

ComplexNumber.prototype.power = function(y) { // y**x
	// uses sqrt function when possible so appropriate special cases are applied
	if (this.real.equals(0.5) && this.imag.isZero()) {
		return y.sqrt();
	}

	let z = null;

	if (y.imag.isZero()) {
		 if (this.imag.isZero()) { // real number to real power
			// special case for negative base with exponent (0, 1),
			// which has a complex solution
			if (y.real.isNegative() && this.real.gt(0) && this.real.lt(1)) {
				z = new ComplexNumber({real: this.real})
				     .multiply(new ComplexNumber({real: y.real}).ln())
				     .exp();
			} else {
				z = new ComplexNumber({real: y.real.toPower(this.real)});
			}
		} else { // real number to complex power
			const real = y.real.toPower(this.real)
			              .times(this.imag.times(y.real.ln())
			              .cos());
			const imag = y.real.toPower(this.real)
			              .times(this.imag.times(y.real.ln())
			              .sin());

			z = new ComplexNumber({real, imag});
		}
	} else {
		if (this.imag.isZero()) { // complex number to real power
			// special case for imaginary base to real power
			if (y.real.isZero()) {
				if (this.real.mod(2).isZero()) {
					z = new ComplexNumber({
						real: y.imag.toPower(this.real).neg()
					});
				} else {
					z = new ComplexNumber({
						imag: y.imag.toPower(this.real).neg()
					});
				}
			} else {
				const a = y.mag.toPower(this.real);

				z = new ComplexNumber({ // de Moivre's theorem
					real: a.times(this.real.times(y.phase).cos()),
					imag: a.times(this.real.times(y.phase).sin())
				});
			}
		} else { // complex number to complex power
			const phase = y.phase;

			const factor = y.real.toPower(2).plus(y.imag.toPower(2))
					        .toPower(this.real.dividedBy(2))
					        .times(this.imag.neg().times(phase).exp());
			const angle = this.real.times(phase)
			               .plus(this.imag.times(y.real.toPower(2)
			               .plus(y.imag.toPower(2)).ln()).times(0.5));

			const real = factor.times(angle.cos());
			const imag = factor.times(angle.sin());

			z = new ComplexNumber({real, imag});
		}
	}

	return z;
};

ComplexNumber.prototype.sqrt = function() {
	let z = null;

	if (this.imag.isZero()) {
		if (this.real.isNegative()) { // negative real
			z = new ComplexNumber({imag: this.real.abs().sqrt().neg()});
		} else { // positive real
			z = new ComplexNumber({real: this.real.sqrt()});
		}
	} else {
		if (this.real.isZero()) { // imaginary
			const root = this.imag.abs().dividedBy(2).sqrt();

			z = new ComplexNumber({
				real: root,
				imag: root.times(Decimal.sign(this.imag))
			});
		} else { // complex
			z = new ComplexNumber({
				mag:   this.mag.sqrt(),
				phase: this.phase.dividedBy(2)
			});
		}
	}

	return z;
};

ComplexNumber.prototype.root = function(y) {
	// uses sqrt function when possible so appropriate special cases are applied
	if (this.real.equals(2) && this.imag.isZero()) {
		return y.sqrt();
	}

	let z = null;

	if (this.imag.isZero()) {
		if (y.imag.isZero()) { // real number to real root
			if (y.real.isNegative()) { // special case for negative base
				z = this.invert().power(y);
			} else {
				z = new ComplexNumber({real: nthroot(y.real, this.real)});
			}
		} else { // complex number to real root
			z = new ComplexNumber({
				mag:   nthroot(y.mag, this.real),
				phase: y.phase.dividedBy(this.real)
			});
		}
	} else { // complex root
		z = this.invert().power(y);
	}

	return z;

	function nthroot(x, n) { // not defined for 0 < n < 1
		return Decimal.div(1, n).times(x.ln()).exp();
	}
};

ComplexNumber.prototype.factorial = function() {
	if (!this.imag.isZero()) {
		throw "Number Must Be Real";
	}

	if (this.real.isNegative()) {
		throw "Number Must Be Positive";
	}

	let z = null;

	if (this.real.isInteger()) {
		z = new ComplexNumber({real: factorial(this.real.toNumber())});
	} else {
		z = new ComplexNumber({real: gamma(this.real.plus(1).toNumber())});
	}

	return z;

	function factorial(n) {
		let f = 1;

		for (let i = n; i >= 1; i--) {
			if (f > Number.MAX_VALUE) {
				throw "Overflow";
			}

			f *= i;
		}

		return f;
	}

	function gamma(n) {
		let f = 0;

		if (n < 0.5) { // Euler's reflection formula
			f = Math.PI / (Math.sin(Math.PI * n) * gamma(1 - n));
		} else { // Lanczos approximation
			const p = [
				0.99999999999980993,
				676.5203681218851,
				-1259.1392167224028,
				771.32342877765313,
				-176.61502916214059,
				12.507343278686905,
				-0.13857109526572012,
				9.9843695780195716e-6,
				1.5056327351493116e-7
			];

			n--;

			const t = n + p.length - 1.5;
			let a = p[0];

			for (let i = 1; i < p.length; i++) {
				a += p[i] / (n + i);
			}

			f = Math.sqrt(2 * Math.PI)
			  * Math.pow(t, n + 0.5)
			  * Math.exp(-t) * a;
		}

		return f;
	}
};

ComplexNumber.prototype.percentage = function(y) { // y% of x
	return this.multiply(new ComplexNumber({real: 100}).divide(y));
};

ComplexNumber.prototype.hypotenuse = function(y) {
	return this.square().add(y.square()).sqrt();
};

ComplexNumber.prototype.ln = function() {
	let z = null;

	if (this.imag.isZero() && this.real.isPositive()) { // real domain is (0, ∞)
		if (this.real.isZero()) {
			throw "Infinity";
		}

		z = new ComplexNumber({real: this.real.ln()});
	} else { // complex or negative real
		z = new ComplexNumber({real: this.mag.ln(), imag: this.phase});
	}

	return z;
};

ComplexNumber.prototype.log10 = function() {
	let z = null;

	if (this.imag.isZero() && this.real.isPositive()) { // real domain is (0, ∞)
		if (this.real.isZero()) {
			throw "Infinity";
		}

		z = new ComplexNumber({real: Decimal.log10(this.real)});
	} else { // complex or negative real
		z = new ComplexNumber({real: 10}).ln().divide(this.ln());
	}

	return z;
};

ComplexNumber.prototype.log2 = function() {
	let z = null;

	if (this.imag.isZero() && this.real.isPositive()) { // real domain is (0, ∞)
		if (this.real.isNegative()) {
			throw "Infinity";
		}

		z = new ComplexNumber({real: Decimal.log2(this.real)});
	} else { // complex or negative real
		z = new ComplexNumber({real: 2}).ln().divide(this.ln());
	}

	return z;
};

ComplexNumber.prototype.exp = function() {
	let z = null;

	if (this.imag.isZero()) { // real
		z = new ComplexNumber({real: this.real.exp()});
	} else { // complex
		const real = this.real.exp().times(this.imag.cos());
		const imag = this.real.exp().times(this.imag.sin());

		z = new ComplexNumber({real, imag});
	}

	return z;
};

ComplexNumber.prototype.pow10 = function() {
	return this.power(new ComplexNumber({real: 10}));
};

ComplexNumber.prototype.pow2 = function() {
	return this.power(new ComplexNumber({real: 2}));
};

ComplexNumber.prototype.sin = function() {
	const theta = this.angle();
	let z = null;

	if (theta.imag.isZero()) {
		z = new ComplexNumber({real: theta.real.sin()});
	} else {
		const real = theta.real.sin().times(theta.imag.cosh());
		const imag = theta.real.cos().times(theta.imag.sinh());

		z = new ComplexNumber({real, imag});
	}

	return z;
};

ComplexNumber.prototype.cos = function() {
	const theta = this.angle();
	let z = null;

	if (theta.imag.isZero()) {
		z = new ComplexNumber({real: theta.real.cos()});
	} else {
		const real = theta.real.cos().times(theta.imag.cosh());
		const imag = theta.real.sin().times(theta.imag.sinh());

		z = new ComplexNumber({real, imag: imag.neg()});
	}

	return z;
};

ComplexNumber.prototype.tan = function() {
	const theta = this.angle();
	let z = null;

	if (theta.imag.isZero()) {
		z = new ComplexNumber({real: theta.real.tan()});
	} else {
		const a = theta.real.tan()
		           .minus(theta.real.tan()
		           .times(theta.imag.tanh().toPower(2)));
		const b = theta.real.tan().toPower(2)
		           .times(theta.imag.tanh().toPower(2)).plus(1);

		const c = theta.imag.tanh()
		           .plus(theta.real.tan().toPower(2)
		           .times(theta.imag.tanh()));
		const d = theta.real.tan().toPower(2)
		           .times(theta.imag.tanh().toPower(2)).plus(1);

		z = new ComplexNumber({real: a.dividedBy(b), imag: c.dividedBy(d)});
	}

	return z;
};

ComplexNumber.prototype.asin = function() {
	let z = null;

	// real domain is [-1, 1]
	if (this.imag.isZero() && this.real.gte(-1) && this.real.lte(1)) {
		z = new ComplexNumber({real: this.real.asin()});
	} else {
		const c = this.real.plus(1).toPower(2)
		           .plus(this.imag.toPower(2)).sqrt();
		const d = this.real.minus(1).toPower(2)
		           .plus(this.imag.toPower(2)).sqrt();

		const a = c.minus(d).times(0.5);
		const b = c.plus(d).times(0.5);

		const real = a.asin();
		const imag = b.plus(b.toPower(2).minus(1).sqrt()).ln();

		z = new ComplexNumber({real, imag});
	}

	return z.arcAngle();
};

ComplexNumber.prototype.acos = function() {
	let z = null;

	// real domain is [-1, 1]
	if (this.imag.isZero() && this.real.gte(-1) && this.real.lte(1)) {
		z = new ComplexNumber({real: this.real.acos()});
	} else {
		const c = this.real.plus(1).toPower(2)
		           .plus(this.imag.toPower(2)).sqrt();
		const d = this.real.minus(1).toPower(2)
		           .plus(this.imag.toPower(2)).sqrt();

		const a = c.minus(d).times(0.5);
		const b = c.plus(d).times(0.5);

		const real = a.acos();
		const imag = b.plus(b.toPower(2).minus(1).sqrt()).ln();

		z = new ComplexNumber({real, imag});
	}

	return z.arcAngle();
};

ComplexNumber.prototype.atan = function() {
	let z = null;

	if (this.imag.isZero()) {
		z = new ComplexNumber({real: this.real.atan()});
	} else {
		if (this.imag.abs().equals(1)) {
			throw "Infinity";
		}

		const real =
			Decimal.atan2(
				this.real.times(2),
				Decimal.sub(1, this.real.toPower(2)).minus(this.imag.toPower(2))
			).times(0.5)
		;
		const imag =
			Decimal.div(
				this.real.toPower(2).plus(this.imag.plus(1).toPower(2)),
				this.real.toPower(2).plus(Decimal.sub(1, this.imag).toPower(2))
			).ln().times(0.25)
		;

		z = new ComplexNumber({real, imag});
	}

	return z.arcAngle();
};

ComplexNumber.prototype.sinh = function() {
	const theta = this.angle();
	let z = null;

	if (theta.imag.isZero()) {
		z = new ComplexNumber({real: theta.real.sinh()});
	} else {
		const real = theta.real.sinh().times(theta.imag.cos());
		const imag = theta.real.cosh().times(theta.imag.sin());

		z = new ComplexNumber({real, imag});
	}

	return z;
};

ComplexNumber.prototype.cosh = function() {
	const theta = this.angle();
	let z = null;

	if (theta.imag.isZero()) {
		z = new ComplexNumber({real: theta.real.cosh()});
	} else {
		const real = theta.real.cosh().times(theta.imag.cos());
		const imag = theta.real.sinh().times(theta.imag.sin());

		z = new ComplexNumber({real, imag});
	}

	return z;
};

ComplexNumber.prototype.tanh = function() {
	const theta = this.angle();
	let z = null;

	if (theta.imag.isZero()) {
		z = new ComplexNumber({real: theta.real.tanh()});
	} else {
		const a = theta.real.times(2).sinh();
		const b = theta.real.times(2).cos().plus(theta.real.times(2).cosh());

		const c = theta.imag.times(2).sin();
		const d = theta.imag.times(2).cos().plus(theta.imag.times(2).cosh());

		z = new ComplexNumber({real: a.dividedBy(b), imag: c.dividedBy(d)});
	}

	return z;
};

ComplexNumber.prototype.asinh = function() {
	let z = null;

	if (this.imag.isZero()) { // real domain is (-∞, ∞)
		z = new ComplexNumber({real: this.real.asinh()});
	} else {
		const a = this.square().add(new ComplexNumber({real: 1}));
		z = this.add(a.sqrt(a)).ln();
	}

	return z.arcAngle();
};

ComplexNumber.prototype.acosh = function() {
	let z = null;

	if (this.real.gte(1)) { // real domain is [1, ∞)
		z = new ComplexNumber({real: this.real.acosh()});
	} else {
		const a = new ComplexNumber({real: 1}).subtract(this.square());
		z = this.add(a.sqrt()).ln();
	}

	return z.arcAngle();
};

ComplexNumber.prototype.atanh = function() {
	let z = null;

	// real domain is [-1, 1]
	if (this.imag.isZero() && this.real.gte(-1) && this.real.lte(1)) {
		z = new ComplexNumber({real: this.real.atanh()});
	} else {
		const a = new ComplexNumber({
			real: this.real.plus(1),
			imag: this.imag
		}).ln();
		const b = new ComplexNumber({
			real: Decimal.sub(1, this.real),
			imag: this.imag.neg()
		}).ln();

		const d = b.subtract(a);

		z = new ComplexNumber({
			real: d.real.dividedBy(2),
			imag: d.imag.dividedBy(2)
		});
	}

	return z.arcAngle();
};

/*
 * Stack prototype
 */

function Stack() {
	this.stack = [new ComplexNumber()];
	this.memory = [];
	this.tape = [new ComplexNumber()];
	this.constants = {};

	this.decInput = INT;
	this.expNotation = OFF;
	this.angleMode = RAD;
	this.imagInput = REAL;
	this.imagDisplay = RECT;

	this.zeros = 0;
	this.exp = 0;

	this.altKey = false;
	this.clearNext = false;
	this.newNext = false;
	this.imagNext = false;
	this.tapeNext = false;
}

Stack.prototype.load = function(data) {
	try {
		const {stack, memory, tape, constants} = data;

		this.stack     = restore(stack)  || [new ComplexNumber()];
		this.memory    = restore(memory) || [];
		this.tape      = restore(tape)   || [new ComplexNumber()];
		this.constants = constants       || {};
	} catch (err) {
		console.error(err);
	}

	display.reset();
	display.updateMemory();

	this.setDecInput(INT);
	this.setExpNotation(OFF);
	this.setAngleMode(RAD);
	this.setImagInput(REAL);
	this.setImagDisplay(RECT);

	// restores arrays of ComplexNumber objects
	function restore(obj) {
		if (obj != undefined) {
			const arr = [];

			for (const row of Object.values(obj)) {
				const z = {};

				// ComplexNumber objects are converted to strings when saved,
				// converts back to Decimal objects
				if (row.real != undefined && row.imag != undefined) {
					for (const [key, value] of Object.entries(row)) {
						z[key] = Decimal(value);
					}

					arr.push(new ComplexNumber(z));
				} else {
					arr.push(row);
				}
			}

			return arr;
		}
	}
};

Stack.prototype.save = function() {
	return {
		stack:       this.stack,
		memory:      this.memory,
		tape:        this.tape,
		constants:   this.constants
	};
};

Stack.prototype.getX = function() {
	return this.stack[this.stack.length - 1];
};

Stack.prototype.getY = function() {
	return this.stack[this.stack.length - 2];
};

Stack.prototype.setX = function(z) {
	this.stack[this.stack.length - 1] = z;

	if (this.newNext || this.tapeNext) {
		this.tape.push(z);
		this.tapeNext = false;
	} else {
		this.tape[this.tape.length - 1] = z;
	}
};

// for binary operations where x and y are combined into a result
Stack.prototype.setXY = function(z) {
	this.stack.splice(this.stack.length - 2, 2);
	this.stack.push(z);
	this.tape.push(z);
};

Stack.prototype.clear = function() {
	this.setX(new ComplexNumber());

	this.clearNext = false;
	this.newNext = false;

	this.setDecInput(INT);
	this.setExpNotation(OFF);
	this.setImagInput(REAL);
	display.updateX();
};

Stack.prototype.clearAll = function() {
	this.stack = [new ComplexNumber()];
	this.tape = [new ComplexNumber()];

	this.clearNext = false;
	this.newNext = false;

	this.setDecInput(INT);
	this.setExpNotation(OFF);
	this.setImagInput(REAL);
	display.reset();
};

Stack.prototype.roll = function() {
	if (this.stack.length < 2) {
		throw "Not Enough Elements";
	}

	this.stack.unshift(this.stack.pop());
	this.tape.push({operation: "roll", type: STACK});

	display.reload();
};

Stack.prototype.swap = function() {
	if (this.stack.length < 2) {
		throw "Not Enough Elements";
	}

	const x = this.stack[this.stack.length - 1];
	const y = this.stack[this.stack.length - 2];

	this.stack[this.stack.length - 1] = y;
	this.stack[this.stack.length - 2] = x;
	this.tape.push({operation: "swap", type: STACK});

	display.updateX();
	display.updateY();
};

Stack.prototype.drop = function() {
	if (this.stack.length > 1) {
		this.stack.pop();
		this.tape.push({operation: "drop", type: STACK});
		display.drop();
	} else {
		this.clear();
	}
};

Stack.prototype.store = function() {
	if (this.altKey) { // replaces first entry instead of adding a new one
		this.memory[0] = this.getX();
	} else { // adds a new entry
		this.memory.push(this.getX());
	}

	display.updateMemory();
};

Stack.prototype.recall = function(index) {
	if (this.memory.length < 1) {
		throw "Memory is Empty";
	}

	let mem = 0;

	if (index != undefined) { // recalls specific index
		if (this.memory[index]) {
			mem = this.memory[index];

			if (!this.altKey) { // recalls without removing
				this.remove(index);
			}
		} else {
			throw "Invalid Memory Index";
		}
	} else { // recalls first
		if (this.altKey) { // recalls without removing
			mem = this.memory[0];
		} else { // recalls and removes
			mem = this.memory.shift();
		}
	}

	const x = this.getX();

	if (x.real.isZero() && x.imag.isZero()) {
		this.setX(mem);
		display.updateX();
	} else {
		this.stack.push(mem);
		this.tape.push(mem);
		display.append(this.getX());
	}

	display.updateMemory();
};

Stack.prototype.remove = function(index) {
	this.memory = this.memory.filter(function(undefined, i) {
		return index != i;
	});

	display.updateMemory();
};

Stack.prototype.rotateMemory = function(dir) {
	if (this.memory.length < 2) {
		return;
	}

	if (dir) {
		this.memory.unshift(this.memory.pop());
	} else {
		this.memory.push(this.memory.shift());
	}

	display.updateMemory();
};

Stack.prototype.newLine = function(z) {
	if (this.expNotation == ON) {
		this.evaluateExp();
		display.updateX();
		return;
	}

	let x = null;

	this.setDecInput(INT);
	this.setExpNotation(OFF);
	this.setImagInput(REAL);

	if (z != undefined) {
		x = new ComplexNumber(z);

		this.stack.push(x);
		display.append(x); // display after push (show new value)
	} else {
		this.clearNext = true;
		this.newNext = false;

		if (this.imagNext) {
			this.imagNext = false;
			x = new ComplexNumber(z);
		} else {
			x = this.getX();
		}

		display.append(x); // display before push (show old value)
		this.stack.push(x);
	}

	this.tape.push(x);
};

Stack.prototype.type = function(n) {
	if (this.newNext) {
		this.newNext = false;
		this.newLine(new ComplexNumber({real: n}));

		return;
	}

	const base = display.base;

	// number is larger than base
	// (e.g., A is typed in decimal or 2 is typed in binary)
	if (n > base - 1) {
		return;
	}

	const key = n.toString(base);
	let x = this.getX();
	let real = "", imag = "";

	if (this.clearNext) {
		x = new ComplexNumber();
		this.clearNext = false;
	} else {
		if (this.imagDisplay == RECT) {
			real = x.real.toNumber().toString(base);
			imag = x.imag.toNumber().toString(base);
		} else {
			real = x.mag.toNumber().toString(base);

			if (this.angleMode == DEG) {
				imag = x.deg.toNumber().toString(base);
			} else {
				imag = x.phase.toNumber().toString(base);
			}
		}
	}

	// real or imaginary component exceeds maximum input length for base
	if (this.imagInput == REAL && real.length >= MAX_DIGITS[base]) {
		return;
	} else if (this.imagInput == IMAG && imag.length >= MAX_DIGITS[base]) {
		return;
	}

	if (this.expNotation == ON) {
		const length = this.exp.toString().length;

		if (length < 2 && (!x.real.isZero() || !x.imag.isZero())) {
			this.exp = Number(this.exp.toString() + key);
		}
	} else {
		if (this.imagInput == REAL) {
			real = input.call(this, real, x.real);
		} else {
			real = base == 10 ? Number(real) : this.parse(real);

			if (this.imagDisplay == RECT) {
				imag = input.call(this, imag, x.imag);
			} else {
				if (this.angleMode == RAD) {
					imag = input.call(this, imag, x.phase);
				} else {
					imag = input.call(this, imag, x.deg);
				}
			}
		}
	}

	let z = null;

	if (this.imagDisplay == RECT) {
		z = new ComplexNumber({real, imag});
	} else {
		if (this.angleMode == RAD) {
			z = new ComplexNumber({mag: real, phase: imag, mode: RAD});
		} else {
			z = new ComplexNumber({mag: real, deg: imag, mode: DEG});
		}
	}

	this.setX(z);
	display.updateX();

	function input(str, mem) {
		if (this.decInput == DEC) {
			if (mem.isInteger()) {
				str += ".";
			}

			str += "0".repeat(this.zeros) + key;
		} else {
			str += key;
		}

		if (key == "0") {
			this.zeros++;
		} else {
			this.zeros = 0;
		}

		if (base == 10) {
			// built-in function only works for decimal
			return Number(str);
		}

		return this.parse(str);
	}
};

Stack.prototype.backspace = function() {
	const x = this.getX();

	if (this.expNotation == ON) {
		if (this.exp.toString().length > 1) {
			this.exp = Number(this.exp.toString().slice(0, -1));

			// handles case when remaining character is hyphen
			// (when deleting negative exp value)
			if (Number.isNaN(this.exp)) {
				this.setExpNotation(OFF);
			}
		} else {
			this.setExpNotation(OFF);
		}
	} else {
		let real = null, imag = null;

		if (this.imagDisplay == RECT) {
			real = x.real;
			imag = x.imag;
		} else {
			real = x.mag;
			imag = this.angleMode == RAD ? x.phase : x.deg;
		}

		if (this.imagInput == REAL) {
			if (real.toString().search("e") == -1) { // no exponential
				if (real.isInteger() && this.decInput == DEC) {
					this.decInput = INT;
				} else {
					let str = real.toString(display.base).slice(0, -1);

					if (str != "-" && str.length > 0) {
						str = parse.call(this, str);
						this.setX(prepare.call(this, {real: str}));
					} else {
						this.clear();
					}
				}
			} else {
				const [intPart, expPart] = real.toString().split("e");
				this.setX(prepare.call(this, {real: intPart, imag}));
				backspaceExp.call(this, expPart);
			}
		} else {
			if (imag.toString().search("e") == -1) { // no exponential
				if (imag.isInteger() && this.decInput == DEC) {
					this.decInput = INT;
				} else {
					if (imag.isZero()) {
						this.setImagInput();
					} else {
						let str = imag.toString(display.base).slice(0, -1);

						if (str != "-" && str.length > 0) {
							str = parse.call(this, str);
							this.setX(prepare.call(this, {real, imag: str}));
						} else {
							this.setX(prepare.call(this, {real}));
						}
					}
				}
			} else {
				const [intPart, expPart] = imag.toString().split("e");
				this.setX(prepare.call(this, {real, imag: intPart}));
				backspaceExp.call(this, expPart);
			}
		}
	}

	if (this.newNext) {
		this.newNext = false;
	}

	display.updateX();

	function parse(n) {
		return display.base == 10 ? Number(n) : this.parse(n);
	}

	function prepare(oldObj) {
		const real = oldObj.real || 0;
		const imag = oldObj.imag || 0;
		let newObj = {};

		if (this.imagDisplay == RECT) {
			newObj = {real, imag};
		} else {
			if (this.angleMode == RAD) {
				newObj = {mag: real, phase: imag, mode: RAD};
			} else {
				newObj = {mag: real, deg: imag, mode: DEG};
			}
		}

		return new ComplexNumber(newObj);
	}

	function backspaceExp(str) {
		str = str.replace("+", "");
		this.exp = str.slice(0, -1);

		this.expNotation = ON;
	}
};

Stack.prototype.evaluateExp = function() {
	let x = this.getX();

	if (this.imagInput == REAL) {
		x = new ComplexNumber({real: x.real + "e" + this.exp, imag: x.imag});
	} else {
		x = new ComplexNumber({real: x.real, imag: x.imag + "e" + this.exp});
	}

	if (!x.real.isFinite()) {
		display.printError("Overflow");
	}

	this.setX(x);
	this.setExpNotation(OFF);
};

Stack.prototype.parse = function(str) {
	let [a, b] = str.split(".");
	let num = 0;

	a = a || 0;
	b = b || 0;

	for (let i = 0; i < a.length; i++) { // whole part
		const n = Number.parseInt(a.charAt(i), display.base);
		num += Decimal.pow(display.base, a.length - i - 1).times(n).toNumber();
	}

	for (let i = 0; i < b.length; i++) { // decimal part
		const n = Number.parseInt(b.charAt(i), display.base);
		num += Decimal.pow(display.base, -(i + 1)).times(n).toNumber();
	}

	return num;
};

Stack.prototype.negate = function() {
	const x = this.getX();

	if (this.expNotation == ON) {
		this.exp = -this.exp;
	} else {
		if (this.imagInput == REAL) {
			this.setX(new ComplexNumber({real: x.real.neg(), imag: x.imag}));
		} else {
			this.setX(new ComplexNumber({real: x.real, imag: x.imag.neg()}));
		}
	}

	display.updateX();
};

Stack.prototype.setDecInput = function(mode=INT) {
	this.zeros = 0;
	this.decInput = mode;
	display.updateX();
};

Stack.prototype.setExpNotation = function(mode=ON) {
	const x = this.getX();

	if (this.expNotation == OFF && x.real.isZero() && x.imag.isZero()) {
		return;
	}

	const button = $("#ee");
	button.classList.toggle("active", mode == ON);

	this.exp = 0;
	this.expNotation = mode;
};

Stack.prototype.setAngleMode = function(mode) {
	const button = $("#deg");
	button.children[0].classList.toggle("hidden", !mode);
	button.children[1].classList.toggle("hidden",  mode);

	this.angleMode = mode;

	display.reload();
	display.updateMemory();
};

Stack.prototype.toggleAngleMode = function() {
	this.setAngleMode(!this.angleMode);
};

Stack.prototype.setImagInput = function(mode=REAL) {
	if (this.expNotation == ON) {
		this.evaluateExp();
	}

	const button = $("#imag");
	button.classList.toggle("active", mode == IMAG);

	if (this.newNext) {
		this.imagNext = true;
	}

	this.imagInput = mode;
	display.updateX();
};

Stack.prototype.setImagDisplay = function(mode=RECT) {
	const rectButton = $("#rect");
	rectButton.children[0].classList.toggle("hidden", !mode);
	rectButton.children[1].classList.toggle("hidden",  mode);

	const imagButton = $("#imag");
	imagButton.children[0].classList.toggle("hidden", !mode);
	imagButton.children[1].classList.toggle("hidden",  mode);

	this.imagDisplay = mode;
	display.reload();
};

Stack.prototype.toggleDecInput = function() {
	if (this.expNotation == ON) {
		return;
	}

	if (this.newNext) {
		this.newLine();
	}

	this.setDecInput(!this.decInput);
};

Stack.prototype.toggleExpNotation = function() {
	if (display.base != 10) {
		return;
	}

	this.setExpNotation(!this.expNotation);
};

Stack.prototype.toggleImagInput = function() {
	const x = this.getX();

	// prevents entering angle without magnitude
	if (x.real.isZero() && this.imagDisplay == POLAR) {
		return;
	}

	if (!x.real.isZero() && this.newNext) {
		this.newLine();
	}

	if (x.imag.isZero()) {
		this.setDecInput(INT);
		this.setImagInput(!this.imagInput);
	}
};

Stack.prototype.toggleImagDisplay = function() {
	this.setImagDisplay(!this.imagDisplay);
};

Stack.prototype.setAlt = function(mode) {
	this.altKey = mode;
};

Stack.prototype.insertNumber = function(value) {
	const x = this.getX();
	const z = new ComplexNumber({real: value});

	if (
		(!this.newNext && this.clearNext)
		|| (x.real.isZero() && x.imag.isZero())
	) {
		this.setX(z);
		display.updateX();
	} else {
		this.newLine(z);
	}

	this.newNext = true;
};

Stack.prototype.insertConstant = function(value) {
	const x = this.getX();
	let z = null;

	if (this.constants[value] == undefined) {
		z = new ComplexNumber({real: CONSTANTS[value].value});
	} else {
		z = this.constants[value].value;
	}

	if (
		(!this.newNext && this.clearNext)
		|| (x.real.isZero() && x.imag.isZero())
	) {
		this.setX(z);
		display.updateX();
	} else {
		this.newLine(z);
	}

	this.newNext = true;
};

Stack.prototype.editConstant = function(key, symbol, title) {
	if (key == "" && symbol == "" && title == "") {
		return;
	}

	this.constants[key] = {symbol, title, value: this.getX()};
	display.updateConstants();
};

Stack.prototype.getConstant = function(value) {
	if (this.constants[value] == undefined) {
		return CONSTANTS[value];
	}

	return this.constants[value];
};

Stack.prototype.resetConstant = function(key) {
	delete this.constants[key];
	display.updateConstants();
};

Stack.prototype.loadConstants = function() {
	for (const constant of Object.values(this.constants)) {
		for (const [key, value] of Object.entries(constant.value)) {
			constant.value[key] = Decimal(value);
		}
	}
};

Stack.prototype.pi = function(fn) {
	const x = this.getX();
	let z = null;

	if (this.imagDisplay == RECT) {
		if (this.imagInput == REAL) {
			z = new ComplexNumber({real: fn(x.real)});
		} else {
			z = new ComplexNumber({real: x.real, imag: fn(x.imag)});
		}
	} else {
		if (this.imagInput == REAL) {
			z = new ComplexNumber({mag: fn(x.mag)});
		} else {
			if (this.angleMode == RAD) {
				z = new ComplexNumber({
					mag: x.mag, phase: fn(x.phase), mode: RAD
				});
			} else {
				z = new ComplexNumber({
					mag: x.mag, deg: fn(x.deg), mode: DEG
				});
			}
		}
	}

	this.newNext = true;

	this.setX(z);
	display.updateX();
};

Stack.prototype.piTimes = function() {
	this.pi(function(x) {
		return Decimal.mul(Math.PI, x);
	});
};

Stack.prototype.piOver = function(x) {
	this.pi(function(x) {
		return Decimal.div(Math.PI, x);
	});
};

Stack.prototype.stackOp = function(fn) {
	try {
		this[fn]();
	} catch (err) {
		display.printError(err);
	}
};

Stack.prototype.unaryOp = function(fn) {
	try {
		if (this.altKey && this.memory.length > 0) {
			this.memory[0] = this.memory[0][fn]();
			display.updateMemory();
		} else {
			const z = this.getX()[fn]();
			this.tapeNext = true;
			this.tape.push({operation: fn, type: UNARY});
			this.setX(z);

			display.updateX();
		}

		this.setImagInput(REAL);
		this.newNext = true;
	} catch (err) {
		display.printError(err);
	}
};

Stack.prototype.binaryOp = function(fn) {
	try {
		// if alt key held,
		// uses first value in memory as y value and saves back to memory,
		// otherwise uses value of y register and pushes to stack
		if (this.altKey) {
			if (this.memory.length == 0) { // creates new memory entry if empty
				this.memory.push(new ComplexNumber());
			}

			const z = this.getX()[fn](this.memory[0]);
			this.memory[0] = z;

			display.updateMemory();
		} else {
			if (this.stack.length < 2) {
				throw "Not Enough Arguments";
			}

			const z = this.getX()[fn](this.getY());
			this.tape.push({operation: fn, type: BINARY});
			this.setXY(z);

			display.combine();
		}

		this.setImagInput(REAL);
		this.newNext = true;
	} catch (err) {
		display.printError(err);
	}
};

Stack.prototype.undo = function() {
	let last = -1;

	for (let i = this.tape.length - 1; i >= 0; i--) { // finds last operation
		if (
			this.tape[i].operation != undefined
			&& this.tape[i].type != undefined
		) {
			last = i;
			break;
		}
	}

	if (last <= 0) { // only numbers in tape, no operations
		// removes last number
		if (this.stack.length > 1 && this.tape.length > 1) {
			this.stack.pop();
			this.tape.pop();
		} else { // only one number in stack
			const index = this.stack.length - 1;

			if (!this.stack[index].mag.isZero()) {
				this.stack[index] = new ComplexNumber({real: 0});
				this.tape[index] = new ComplexNumber({real: 0});
			}
		}
	} else {
		// removes everything after last operation
		const tape = this.tape.slice(0, last);

		this.tape = [];
		this.stack = [];

		let skipNext = false;

		for (const item of tape) {
			if (skipNext) { // skips result of last unary/binary operation
				skipNext = false;
				continue;
			}

			// operation
			if (item.operation != undefined && item.type != undefined) {
				if (item.type == STACK) {
					this[item.operation];
				} else if (item.type == UNARY) {
					this.unaryOp(item.operation);
					skipNext = true;
				} else if (item.type == BINARY) {
					this.binaryOp(item.operation);
					skipNext = true;
				}
			} else { // number
				this.stack.push(item);
				this.tape.push(item);
				display.append(item);
			}
		}
	}

	display.reset();
};

/*
 * Display prototype
 */

function Display() {
	this.base = 10;

	this.overlay = "";
	this.pinned = "";
}

Display.prototype.load = function(data) {
	const {base, pinned} = data;

	this.base   = base   || 10;
	this.pinned = pinned || "";

	this.setBase(this.base);

	if (this.pinned != "") { // reopens tape if pinned
		this.updateTape();

		$("#tape").classList.add("pinned");
		$("#title").textContent = this.pinned;
		$("#pin").textContent = "Unpin";
	}
};

Display.prototype.save = function() {
	return {
		base:   this.base,
		pinned: this.pinned
	};
};

// appends new row
Display.prototype.append = function(z, renumber=true) {
	const tr = document.createElement("tr");

	try {
		const row = document.createElement("td");
		row.className = "row";
		row.appendChild(document.createTextNode(z.display()));
		this.resize(row);
		tr.appendChild(row);

		const reg = document.createElement("td");
		reg.className = "reg";
		tr.appendChild(reg);

		$("#stack").appendChild(tr);
		tr.scrollIntoView();

		if (renumber) {
			this.renumber();
			this.clearError();
		}
	} catch (err) {
		this.printError(err);
	}

	this.updateTape();
};

// updates single row
Display.prototype.update = function(offset) {
	try {
		const regs = $$(".row");
		const element = regs[regs.length - offset];
		const register = stack.stack[stack.stack.length - offset];
		element.textContent = register.display(offset == 1);

		this.resize(element);

		if (stack.exp) {
			const span = document.createElement("span");
			span.classList.add("exp");
			const exp = stack.exp < 0 ? "−" + Math.abs(stack.exp) : stack.exp;
			span.appendChild(document.createTextNode(exp));
			element.appendChild(span);
		}

		this.clearError();
	} catch (err) {
		this.printError(err);
	}

	this.updateTape();
};

Display.prototype.updateX = function() {
	this.update(1);
};

Display.prototype.updateY = function() {
	this.update(2);
};

Display.prototype.drop = function() {
	const element = $("#stack");
	element.removeChild(element.lastChild);

	this.renumber();
	this.updateTape();
};

// inserts all rows
Display.prototype.reset = function() {
	const table = document.createElement("table");
	table.id = "stack";

	$("#stack").replaceWith(table);

	for (const row of stack.stack) {
		this.append(row, false);
	}

	this.renumber();
};

// reloads all rows
Display.prototype.reload = function() {
	for (const i of stack.stack.keys()) {
		this.update(i + 1);
	}
};

// updates row numbers
Display.prototype.renumber = function() {
	const regs = $$(".reg");
	const rows = $$(".row");

	for (let [i, element] of regs.entries()) {
		const row = regs.length - i - 1;
		let reg = 0;

		switch (row) {
			case 0:
				reg = "x";
				rows[i].id = "x";
				break;
			case 1:
				reg = "y";
				rows[i].id = "y";
				break;
			default:
				reg = row - 1;
				rows[i].removeAttribute("id");
		}

		element.textContent = reg;
	}

	$("#depth").textContent = regs.length - 1;
};

Display.prototype.printError = function(message) {
	const element = $("#error span");
	element.textContent = message;
	element.classList.remove("hidden");

	console.error(message);
};

Display.prototype.clearError = function() {
	const element = $("#error span");
	element.textContent = "";
	element.classList.add("hidden");
};

Display.prototype.resize = function(element) {
	const length = element.textContent.length;

	element.classList.toggle("medium", length > 20 && length <= 25);
	element.classList.toggle("small",  length > 25 && length <= 30);
	element.classList.toggle("tiny",   length > 30);
};

// combines two rows (for binary operations)
Display.prototype.combine = function() {
	const regs = $$(".row");
	const element = regs[regs.length - 2];
	element.parentNode.parentNode.removeChild(element.parentNode);
	this.resize(element);

	this.updateX();
	this.renumber();
};

Display.prototype.setBase = function(base) {
	// disables numerals larger than selected base
	for (const element of $$(".number")) {
		element.disabled = Number(element.value) > base - 1;
	}

	for (const element of $$(".base")) {
		element.classList.toggle("active", Number(element.value) == base);
	}

	$("#ee").disabled = base != 10;

	if (base != 10) {
		stack.setExpNotation(OFF);
	}

	this.base = base;
	this.reload();
	this.updateMemory();
};

Display.prototype.rotateBase = function(dir) {
	const bases = [];
	let index = 0;

	for (const element of $$(".base")) {
		bases.push(Number(element.value));
	}

	for (const [i, base] of bases.entries()) {
		if (this.base == base) {
			if (dir) {
				index = i == 0 ? bases.length - 1 : i - 1;
			} else {
				index = i == bases.length - 1 ? 0 : i + 1;
			}
		}
	}

	this.setBase(bases[index]);
};

Display.prototype.openConstantEditor = function(value) {
	const constant = stack.getConstant(value);

	$("#symbol").value = constant.symbol;
	$("#title").value = constant.title;

	$("#save").value = value;
};

Display.prototype.updateConstants = function() {
	for (const element of $$(".constant")) {
		const constant = stack.getConstant(Number(element.value));
		let symbol = constant.symbol || "";

		// LaTeX-style syntax for subscripts and superscripts
		symbol = symbol.replace(/\*([^*_^\s]+)\*/, "<i>$1<i>");
		symbol = symbol.replace(/_([^*_^\s{}]+)/, "<sub>$1</sub>");
		symbol = symbol.replace(/_{([^}]+)}/, "<sub>$1</sub>");
		symbol = symbol.replace(/\^([^*_^\s{}]+)/, "<sup>$1</sup>");
		symbol = symbol.replace(/\^{([^}]+)}/, "<sup>$1</sup>");

		element.innerHTML = symbol;

		const title = constant.title + (constant.title == "" ? "" : "\n");
		element.setAttribute("title", title + CONSTANT_CAPTION);
	}
};

Display.prototype.updateMemory = function() {
	const div = document.createElement("div");
	div.id = "bank";

	for (const [i, item] of stack.memory.entries()) {
		try {
			const button = document.createElement("button");
			button.value = i;
			button.appendChild(document.createTextNode(item.display()));
			button.setAttribute("type", "button");
			button.setAttribute("title", MEMORY_CAPTION);
			div.appendChild(button);
		} catch (err) {
			console.error(err);
			continue;
		}
	}

	$("#memory").textContent = div.children.length;
	$("#recall").disabled = div.children.length < 1;

	$("#bank").replaceWith(div);
};

Display.prototype.updateTape = function() {
	if (this.pinned != "") {
		this.openTape(this.pinned);
	}
};

Display.prototype.openTape = function(source) {
	const ul = document.createElement("ul");
	ul.id = "lines";

	for (const row of stack[source]) {
		try {
			const li = document.createElement("li");
			let text = "";

			if (row.real != undefined && row.imag != undefined) {
				text = row.display();
				li.className = "line";
			} else if (row.operation != undefined && row.type != undefined) {
				text = row.operation;
				li.className = "operation";
			} else {
				text = row;
			}

			li.appendChild(document.createTextNode(text));
			ul.appendChild(li);

			li.scrollIntoView(); // for long lists
		} catch (err) {
			console.error(err);
			continue;
		}
	}

	$("#lines").replaceWith(ul);
};

Display.prototype.pin = function(source) {
	if (this.pinned == "") {
		$("#tape").classList.add("pinned");
		$("#tape").classList.remove("open");

		$("#pin").textContent = "Unpin";

		this.overlay = "";
		this.pinned = source;
	} else {
		$("#tape").classList.remove("pinned");
		$("#tape").classList.toggle("open", this.overlay == "");

		$("#pin").textContent = "Pin";

		this.overlay = "tape";
		this.pinned = "";
	}
};

Display.prototype.closeOverlays = function() {
	for (const overlay of $$(".overlay")) {
		overlay.classList.remove("open");
	}

	this.overlay = "";
};

Display.prototype.toggleOverlay = function(element) {
	if (this.overlay == "") {
		element.classList.add("open");
		this.overlay = element.id;
	} else {
		this.closeOverlays();
	}
};

Display.prototype.toggleTape = function(source) {
	const caption = source.charAt(0).toUpperCase() + source.slice(1);
	$("#tape .caption").textContent = caption;
	$("#pin").value = source;

	if (this.pinned == "") { // opens as overlay if nothing is pinned
		this.toggleOverlay($("#tape"));
		this.openTape(source);
	} else if (this.pinned == source) { // hides if pinned
		$("#tape").classList.remove("pinned");
		$("#pin").textContent = "Pin";

		this.pinned = "";
	} else { // replaces pinned
		this.pinned = source;
		this.openTape(source);
	}
};

/*
 * Storage prototype
 */

function Storage(name, list) {
	this.name = name;
	this.list = list;
}

Storage.prototype.load = function() {
	let data = null;

	try {
		data = JSON.parse(localStorage.getItem(this.name)) || {};
	} catch (err) {
		console.error(err);
	}

	try {
		for (const [key, value] of Object.entries(this.list)) {
			value.load(data[key] || {});
		}
	} catch (err) {
		console.error(err);
		this.clear(); // clears local storage if invalid
	}
};

Storage.prototype.save = function() {
	let data = {};

	for (const [key, value] of Object.entries(this.list)) {
		data[key] = value.save();
	}

	try {
		localStorage.setItem(this.name, JSON.stringify(data));
	} catch (err) {
		console.error(err);
	}
};

Storage.prototype.clear = function() {
	localStorage.removeItem(this.name);
};