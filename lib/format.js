'use strict'

const describe = require('./describe')

const alwaysFormat = () => true

function formatDescriptor (subject) {
  if (subject.isPrimitive === true) return subject.format('', '')

  const circular = new Set()
  const lookup = new Map()

  let level
  let indent
  let innerIndent
  const setLevel = newLevel => {
    level = newLevel
    indent = '  '.repeat(level)
    innerIndent = indent + '  '
  }
  setLevel(0)

  const stack = []
  let topIndex = -1

  let retval
  while (retval === undefined) {
    if (subject.isComplex) {
      lookup.set(subject.pointer, subject)
    }

    if (subject.isPointer) {
      subject = lookup.get(subject.pointer)
    }

    let formatted = null
    if (circular.has(subject)) {
      formatted = '[Circular]'
    } else if (subject.format) {
      formatted = subject.format(indent, innerIndent)
    }

    if (typeof formatted === 'string') {
      if (topIndex === -1) {
        retval = formatted
      } else {
        stack[topIndex].buffer(formatted, subject, '')
      }
    } else if (formatted !== null) {
      const record = Object.assign({ shouldFormat: alwaysFormat }, formatted, {
        origin: subject,
        recursor: subject.createRecursor
          ? subject.createRecursor()
          : null,
        restoreLevel: level
      })

      if (record.nestInner) setLevel(level + 1)
      circular.add(subject)
      stack.push(record)
      topIndex++
    } else if (topIndex === -1) {
      retval = null
    }

    while (retval === undefined && topIndex >= 0) {
      do {
        subject = stack[topIndex].recursor()
      } while (subject && !stack[topIndex].shouldFormat(subject))

      if (subject) {
        break
      }

      const record = stack.pop()
      topIndex--
      setLevel(record.restoreLevel)
      circular.delete(record.origin)

      const formattedRecord = record.finalize('')
      if (formattedRecord !== null) {
        if (topIndex === -1) {
          retval = formattedRecord
        } else {
          stack[topIndex].buffer(formattedRecord, record.origin, '')
        }
      } else {
        retval = null
      }
    }
  }

  return retval
}
exports.formatDescriptor = formatDescriptor

function format (value) {
  return formatDescriptor(describe(value))
}
exports.format = format