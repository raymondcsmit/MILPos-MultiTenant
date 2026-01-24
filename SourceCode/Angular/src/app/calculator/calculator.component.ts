import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-calculator',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './calculator.component.html',
    styleUrls: ['./calculator.component.css']
})
export class CalculatorComponent {
    display: string = '0';
    result: string = '';

    append(value: string) {
        // If starting fresh after result
        if (this.result && !this.display) {
            if (/[0-9.]/.test(value)) {
                this.display = '';
                this.result = '';
            }
        }

        // Handle percentage
        if (value === '%') {
            const match = this.display.match(/(\d+(\.\d+)?)$/); // last number
            if (!match) return;

            const number = parseFloat(match[1]);
            let replacement = (number / 100).toString();

            // Check operator before %
            const operatorMatch = this.display.match(/([+\-*/])(\d+(\.\d+)?)$/);
            if (operatorMatch) {
                const operator = operatorMatch[1];
                const leftSide = this.display.slice(0, -(operatorMatch[2].length + 1));
                const leftValue = parseFloat(leftSide);

                if (!isNaN(leftValue) && ['+', '-'].includes(operator)) {
                    replacement = ((leftValue * number) / 100).toString();
                }
            }

            this.display = this.display.replace(/(\d+(\.\d+)?)$/, replacement);
            this.updateResult();
            return;
        }

        // Handle operators
        if (/[+\-*/]/.test(value)) {
            if (this.display === '' && value !== '-') return; // allow negative start
            if (/[+\-*/]$/.test(this.display)) {
                this.display = this.display.slice(0, -1) + value; // replace operator
                return;
            }
        }

        // Prevent multiple decimals
        if (value === '.') {
            const parts = this.display.split(/[+\-*/]/);
            if (parts[parts.length - 1].includes('.')) return;
        }

        // Prevent leading zeros
        if (value === '0' && (this.display === '0' || /[+\-*/]0$/.test(this.display))) return;

        // Append normally
        if (this.display === '0' && /[0-9]/.test(value)) {
            this.display = value;
        } else {
            this.display += value;
        }

        this.updateResult();
    }

    clear() {
        this.display = '0';
        this.result = '';
    }

    delete() {
        if (!this.display || this.display === '0') return;
        this.display = this.display.slice(0, -1);
        if (!this.display) this.display = '0';
        this.updateResult();
    }

    calculate() {
        if (!this.display || /[+\-*/.]$/.test(this.display)) return;

        try {
            const sanitized = this.display.replace(/\b0+(\d+)(?![.\d])/g, '$1');
            // eslint-disable-next-line no-new-func
            const evalResult = new Function('return ' + sanitized)();
            if (evalResult === Infinity || evalResult === -Infinity) {
                this.result = 'Div by 0';
            } else if (isNaN(evalResult)) {
                this.result = 'Error';
            } else {
                this.result = String(evalResult);
                this.display = this.result; // keep result for chaining
            }
        } catch {
            this.result = 'Error';
        }
    }

    private updateResult() {
        try {
            if (/^[\d.]+$/.test(this.display)) {
                this.result = this.display;
            } else if (!/[+\-*/]$/.test(this.display)) {
                // eslint-disable-next-line no-new-func
                const evalResult = new Function('return ' + this.display)();
                if (!isNaN(evalResult)) {
                    this.result = String(evalResult);
                }
            }
        } catch {
            this.result = '';
        }
    }
}
