import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveClass(className: string): R
      toHaveAttribute(attr: string, value?: string): R
      toHaveTextContent(text: string | RegExp): R
      toBeVisible(): R
      toBeDisabled(): R
      toBeEnabled(): R
      toBeRequired(): R
      toBeValid(): R
      toBeInvalid(): R
      toHaveValue(value: string | string[] | number): R
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R
      toBeChecked(): R
      toHaveFocus(): R
      toHaveFormValues(expectedValues: Record<string, unknown>): R
      toHaveStyle(css: string | Record<string, unknown>): R
      toHaveAccessibleName(name: string | RegExp): R
      toHaveAccessibleDescription(description: string | RegExp): R
    }
  }
}

export {} 