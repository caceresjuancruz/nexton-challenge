import { Controller, Post, Body, BadRequestException } from '@nestjs/common';

interface CalculationResult {
  result: number;
}

type Operation = (a: number, b: number) => number;

interface OperatorConfig {
  [key: string]: {
    precedence: number;
    operation: Operation;
  };
}

@Controller('calculator')
export class CalculatorController {
  private readonly operators: OperatorConfig = {
    '+': {
      precedence: 1,
      operation: (a: number, b: number): number => a + b,
    },
    '-': {
      precedence: 1,
      operation: (a: number, b: number): number => a - b,
    },
    '*': {
      precedence: 2,
      operation: (a: number, b: number): number => a * b,
    },
    '/': {
      precedence: 2,
      operation: (a: number, b: number): number => {
        if (b === 0) throw new Error('Division by zero');
        return a / b;
      },
    },
  };

  @Post()
  calculate(@Body('expression') expression: string): CalculationResult {
    try {
      const result = this.evaluateExpression(expression);
      return { result };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new BadRequestException('Invalid mathematical expression');
    }
  }

  private evaluateExpression(expression: string): number {
    expression = expression.replace(/\s+/g, '');
    return this.evaluateWithParentheses(expression);
  }

  private evaluateWithParentheses(expression: string): number {
    let start = expression.lastIndexOf('(');

    while (start !== -1) {
      const end = expression.indexOf(')', start);
      if (end === -1) throw new Error('Unmatched parentheses');

      const subExpression = expression.slice(start + 1, end);
      const result = this.calculateOperation(subExpression);

      expression =
        expression.slice(0, start) + result + expression.slice(end + 1);
      start = expression.lastIndexOf('(');
    }

    return this.calculateOperation(expression);
  }

  private calculateOperation(expression: string): number {
    const numbers: number[] = [];
    const operators: string[] = [];
    let currentNumber = '';

    for (const char of expression) {
      if (this.isNumber(char)) {
        currentNumber += char;
        continue;
      }

      if (currentNumber) {
        numbers.push(Number(currentNumber));
        currentNumber = '';
      }

      if (this.isOperator(char)) {
        while (
          operators.length > 0 &&
          this.hasPrecedence(char, operators[operators.length - 1])
        ) {
          this.executeOperation(numbers, operators.pop()!);
        }
        operators.push(char);
      }
    }

    if (currentNumber) {
      numbers.push(Number(currentNumber));
    }

    while (operators.length > 0) {
      this.executeOperation(numbers, operators.pop()!);
    }

    return numbers[0];
  }

  private isNumber(char: string): boolean {
    return /\d/.test(char);
  }

  private isOperator(char: string): boolean {
    return char in this.operators;
  }

  private hasPrecedence(op1: string, op2: string): boolean {
    return this.operators[op2].precedence >= this.operators[op1].precedence;
  }

  private executeOperation(numbers: number[], operator: string): void {
    const b = numbers.pop()!;
    const a = numbers.pop()!;
    numbers.push(this.operators[operator].operation(a, b));
  }
}
