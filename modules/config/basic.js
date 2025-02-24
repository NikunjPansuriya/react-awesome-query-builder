import React from 'react';
import * as Widgets from '../components/widgets/index.js';
import * as Operators from '../components/operators';
import {SqlString} from '../utils/sqlFormat.js';
import {escapeRegExp} from '../utils/stuff.js';
import moment from 'moment';
import {settings as defaultSettings} from '../config/default';

const {
    TextWidget,
    NumberWidget,
    SliderWidget,
    RangeWidget,
    SelectWidget,
    MultiSelectWidget,
    DateWidget,
    BooleanWidget,
    TimeWidget,
    DateTimeWidget,

    ValueFieldWidget
} = Widgets;
const { ProximityOperator } = Operators;


//----------------------------  conjunctions

const conjunctions = {
  AND: {
      label: 'And',
      mongoConj: '$and',
      reversedConj: 'OR',
      formatConj: (children, conj, not, isForDisplay) => {
          return children.size > 1 ?
              (not ? "NOT " : "") + '(' + children.join(' ' + (isForDisplay ? "AND" : "&&") + ' ') + ')'
              : (not ? "NOT (" : "") + children.first() + (not ? ")" : "");
      },
      sqlFormatConj: (children, conj, not) => {
        return children.size > 1 ?
            (not ? "NOT " : "") + '(' + children.join(' ' + "AND" + ' ') + ')'
            : (not ? "NOT (" : "") + children.first() + (not ? ")" : "");
      },
  },
  OR: {
      label: 'Or',
      mongoConj: '$or',
      reversedConj: 'AND',
      formatConj: (children, conj, not, isForDisplay) => {
          return children.size > 1 ?
              (not ? "NOT " : "") + '(' + children.join(' ' + (isForDisplay ? "OR" : "||") + ' ') + ')'
              : (not ? "NOT (" : "") + children.first() + (not ? ")" : "");
      },
      sqlFormatConj: (children, conj, not) => {
        return children.size > 1 ?
            (not ? "NOT " : "") + '(' + children.join(' ' + "OR" + ' ') + ')'
            : (not ? "NOT (" : "") + children.first() + (not ? ")" : "");
      },
  },
};

//----------------------------  operators

const operators = {
  equal: {
      label: '==',
      labelForFormat: '==',
      sqlOp: '=',
      reversedOp: 'not_equal',
      mongoFormatOp: (field, op, value) => ({ [field]: { '$eq': value } }),
  },
  not_equal: {
      label: '!=',
      labelForFormat: '!=',
      sqlOp: '<>',
      reversedOp: 'equal',
      mongoFormatOp: (field, op, value) => ({ [field]: { '$ne': value } }),
  },
  less: {
      label: '<',
      labelForFormat: '<',
      sqlOp: '<',
      reversedOp: 'greater_or_equal',
      mongoFormatOp: (field, op, value) => ({ [field]: { '$lt': value } }),
  },
  less_or_equal: {
      label: '<=',
      labelForFormat: '<=',
      sqlOp: '<=',
      reversedOp: 'greater',
      mongoFormatOp: (field, op, value) => ({ [field]: { '$lte': value } }),
  },
  greater: {
      label: '>',
      labelForFormat: '>',
      sqlOp: '>',
      reversedOp: 'less_or_equal',
      mongoFormatOp: (field, op, value) => ({ [field]: { '$gt': value } }),
  },
  greater_or_equal: {
      label: '>=',
      labelForFormat: '>=',
      sqlOp: '>=',
      reversedOp: 'less',
      mongoFormatOp: (field, op, value) => ({ [field]: { '$gte': value } }),
  },
  like: {
      label: 'Like',
      labelForFormat: 'Like',
      reversedOp: 'not_like',
      sqlOp: 'LIKE',
      sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
        if (valueSrc == 'value') {
            return `${field} LIKE ${values}`;
        } else return undefined; // not supported
      },
      mongoFormatOp: (field, op, value) => ({ [field]: new RegExp(escapeRegExp(value)) }),
  },
  not_like: {
      label: 'Not like',
      reversedOp: 'like',
      labelForFormat: 'Not Like',
      sqlOp: 'NOT LIKE',
      sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
        if (valueSrc == 'value') {
            return `${field} NOT LIKE ${values}`;
        } else return undefined; // not supported
      },
      mongoFormatOp: (field, op, value) => ({ [field]: { '$ne': new RegExp(escapeRegExp(value)) } }),
  },
  between: {
      label: 'Between',
      labelForFormat: 'BETWEEN',
      sqlOp: 'BETWEEN',
      cardinality: 2,
      formatOp: (field, op, values, valueSrcs, valueTypes, opDef, operatorOptions, isForDisplay) => {
          let valFrom = values.first();
          let valTo = values.get(1);
          if (isForDisplay)
              return `${field} >= ${valFrom} AND ${field} <= ${valTo}`;
          else
              return `${field} >= ${valFrom} && ${field} <= ${valTo}`;
      },
      mongoFormatOp: (field, op, values) => ({ [field]: { '$gte': values[0], '$lte': values[1] } }),
      valueLabels: [
          'Value from',
          'Value to'
      ],
      textSeparators: [
          null,
          'and'
      ],
      reversedOp: 'not_between',
  },
  not_between: {
      label: 'Not between',
      labelForFormat: 'NOT BETWEEN',
      sqlOp: 'NOT BETWEEN',
      cardinality: 2,
      mongoFormatOp: (field, op, values) => ({ [field]: { '$not': { '$gte': values[0], '$lte': values[1] } } }),
      valueLabels: [
          'Value from',
          'Value to'
      ],
      textSeparators: [
          null,
          'and'
      ],
      reversedOp: 'between',
  },
  range_between: {
      label: 'Between',
      labelForFormat: 'BETWEEN',
      sqlOp: 'BETWEEN',
      cardinality: 2,
      isSpecialRange: true, // to show 1 range widget instead of 2
      formatOp: (field, op, values, valueSrcs, valueTypes, opDef, operatorOptions, isForDisplay) => {
          let valFrom = values.first();
          let valTo = values.get(1);
          if (isForDisplay)
              return `${field} >= ${valFrom} AND ${field} <= ${valTo}`;
          else
              return `${field} >= ${valFrom} && ${field} <= ${valTo}`;
      },
      mongoFormatOp: (field, op, values) => ({ [field]: { '$gte': values[0], '$lte': values[1] } }),
      valueLabels: [
          'Value from',
          'Value to'
      ],
      textSeparators: [
          null,
          'and'
      ],
      reversedOp: 'range_not_between',
  },
  range_not_between: {
      label: 'Not between',
      labelForFormat: 'NOT BETWEEN',
      sqlOp: 'NOT BETWEEN',
      cardinality: 2,
      isSpecialRange: true, // to show 1 range widget instead of 2
      mongoFormatOp: (field, op, values) => ({ [field]: { '$not': { '$gte': values[0], '$lte': values[1] } } }),
      valueLabels: [
          'Value from',
          'Value to'
      ],
      textSeparators: [
          null,
          'and'
      ],
      reversedOp: 'range_between',
  },
  is_empty: {
      isUnary: true,
      label: 'Is empty',
      labelForFormat: 'IS EMPTY',
      sqlOp: 'IS EMPTY',
      cardinality: 0,
      reversedOp: 'is_not_empty',
      formatOp: (field, op, value, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
          return isForDisplay ? `${field} IS EMPTY` : `!${field}`;
      },
      mongoFormatOp: (field, op) => ({ [field]: { '$exists': false } }),
  },
  is_not_empty: {
      isUnary: true,
      label: 'Is not empty',
      labelForFormat: 'IS NOT EMPTY',
      sqlOp: 'IS NOT EMPTY',
      cardinality: 0,
      reversedOp: 'is_empty',
      formatOp: (field, op, value, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
          return isForDisplay ? `${field} IS NOT EMPTY` : `!!${field}`;
      },
      mongoFormatOp: (field, op) => ({ [field]: { '$exists': true } }),
  },
  select_equals: {
      label: '==',
      labelForFormat: '==',
      sqlOp: '=', // enum/set
      formatOp: (field, op, value, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
          return `${field} == ${value}`;
      },
      mongoFormatOp: (field, op, value) => ({ [field]: { '$eq': value } }),
      reversedOp: 'select_not_equals',
  },
  select_not_equals: {
      label: '!=',
      labelForFormat: '!=',
      sqlOp: '<>', // enum/set
      formatOp: (field, op, value, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
          return `${field} != ${value}`;
      },
      mongoFormatOp: (field, op, value) => ({ [field]: { '$ne': value } }),
      reversedOp: 'select_equals',
  },
  select_any_in: {
      label: 'Any in',
      labelForFormat: 'IN',
      sqlOp: 'IN',
      formatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
          if (valueSrc == 'value')
              return `${field} IN (${values.join(', ')})`;
          else
              return `${field} IN (${values})`;
      },
      sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
          return `${field} IN (${values.join(', ')})`;
      },
      mongoFormatOp: (field, op, values) => ({ [field]: { '$in': values } }),
      reversedOp: 'select_not_any_in',
  },
  select_not_any_in: {
      label: 'Not in',
      labelForFormat: 'NOT IN',
      sqlOp: 'NOT IN',
      formatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
          if (valueSrc == 'value')
              return `${field} NOT IN (${values.join(', ')})`;
          else
              return `${field} NOT IN (${values})`;
      },
      sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
          return `${field} NOT IN (${values.join(', ')})`;
      },
      mongoFormatOp: (field, op, values) => ({ [field]: { '$nin': values } }),
      reversedOp: 'select_any_in',
  },
  multiselect_equals: {
      label: 'Equals',
      labelForFormat: '==',
      sqlOp: '=',
      formatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
          if (valueSrc == 'value')
              return `${field} == [${values.join(', ')}]`;
          else
              return `${field} == ${values}`;
      },
      sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
          if (valueSrc == 'value')
              // set
              return `${field} = '${values.map(v => SqlString.trim(v)).join(',')}'`;
          else
              return undefined; //not supported
      },
      mongoFormatOp: (field, op, values) => ({ [field]: { '$eq': values } }),
      reversedOp: 'multiselect_not_equals',
  },
  multiselect_not_equals: {
      label: 'Not equals',
      labelForFormat: '!=',
      sqlOp: '<>',
      formatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
          if (valueSrc == 'value')
              return `${field} != [${values.join(', ')}]`;
          else
              return `${field} != ${values}`;
      },
      sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
          if (valueSrc == 'value')
              // set
              return `${field} != '${values.map(v => SqlString.trim(v)).join(',')}'`;
          else
              return undefined; //not supported
      },
      mongoFormatOp: (field, op, values) => ({ [field]: { '$ne': values } }),
      reversedOp: 'multiselect_equals',
  },
  proximity: {
      label: 'Proximity search',
      cardinality: 2,
      valueLabels: [
          { label: 'Word 1', placeholder: 'Enter first word' },
          { label: 'Word 2', placeholder: 'Enter second word' },
      ],
      textSeparators: [
          //'Word 1',
          //'Word 2'
      ],
      formatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
          const val1 = values.first();
          const val2 = values.get(1);
          const prox = operatorOptions.get('proximity') || opDef.options.defaultProximity;
          return `${field} ${val1} NEAR/${prox} ${val2}`;
      },
      sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
          const val1 = values.first();
          const val2 = values.get(1);
          const _val1 = SqlString.trim(val1);
          const _val2 = SqlString.trim(val2);
          const prox = operatorOptions.get('proximity') || opDef.options.defaultProximity;
          return `CONTAINS(${field}, 'NEAR((${_val1}, ${_val2}), ${prox})')`;
      },
      mongoFormatOp: (field, op, values) => (undefined), // not supported
      options: {
          optionLabel: "Near", // label on top of "near" selectbox (for config.settings.showLabels==true)
          optionTextBefore: "Near", // label before "near" selectbox (for config.settings.showLabels==false)
          optionPlaceholder: "Select words between", // placeholder for "near" selectbox
          factory: (props) => <ProximityOperator {...props} />,
          minProximity: 2,
          maxProximity: 10,
          defaultProximity: 2,
      }
  },
};

//----------------------------  widgets

const widgets = {
  text: {
      type: "text",
      valueSrc: 'value',
      valueLabel: "String",
      valuePlaceholder: "Enter string",
      factory: (props) => <TextWidget {...props} />,
      formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
          return isForDisplay ? '"' + val + '"' : JSON.stringify(val);
      },
      sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
          return (op == 'like' || op == 'not_like') ? SqlString.escapeLike(val) : SqlString.escape(val);
      },
  },
  number: {
      type: "number",
      valueSrc: 'value',
      factory: (props) => <NumberWidget {...props} />,
      valueLabel: "Number",
      valuePlaceholder: "Enter number",
      valueLabels: [
          { label: 'Number from', placeholder: 'Enter number from' },
          { label: 'Number to', placeholder: 'Enter number to' },
      ],
      formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
          return isForDisplay ? val : JSON.stringify(val);
      },
      sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
        return SqlString.escape(val);
      },
  },
  slider: {
      type: "number",
      valueSrc: 'value',
      factory: (props) => <SliderWidget {...props} />,
      valueLabel: "Number",
      valuePlaceholder: "Enter number or move slider",
      formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
          return isForDisplay ? val : JSON.stringify(val);
      },
      sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
        return SqlString.escape(val);
      },
  },
  rangeslider: {
      type: "number",
      valueSrc: 'value',
      factory: (props) => <RangeWidget {...props} />,
      valueLabel: "Range",
      valuePlaceholder: "Select range",
      valueLabels: [
          { label: 'Number from', placeholder: 'Enter number from' },
          { label: 'Number to', placeholder: 'Enter number to' },
      ],
      formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
          return isForDisplay ? val : JSON.stringify(val);
      },
      sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
        return SqlString.escape(val);
      },
      singleWidget: 'slider',
  },
  select: {
      type: "select",
      valueSrc: 'value',
      factory: (props) => <SelectWidget {...props} />,
      valueLabel: "Value",
      valuePlaceholder: "Select value",
      formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
          let valLabel = fieldDef.listValues[val];
          return isForDisplay ? '"' + valLabel + '"' : JSON.stringify(val);
      },
      sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
          return SqlString.escape(val);
      },
  },
  multiselect: {
      type: "multiselect",
      valueSrc: 'value',
      factory: (props) => <MultiSelectWidget {...props} />,
      valueLabel: "Values",
      valuePlaceholder: "Select values",
      formatValue: (vals, fieldDef, wgtDef, isForDisplay) => {
          let valsLabels = vals.map(v => fieldDef.listValues[v]);
          return isForDisplay ? valsLabels.map(v => '"' + v + '"') : vals.map(v => JSON.stringify(v));
      },
      sqlFormatValue: (vals, fieldDef, wgtDef, op, opDef) => {
          return vals.map(v => SqlString.escape(v));
      },
  },
  date: {
      type: "date",
      valueSrc: 'value',
      factory: (props) => <DateWidget {...props} />,
      dateFormat: 'DD.MM.YYYY',
      valueFormat: 'YYYY-MM-DD',
      valueLabel: "Date",
      valuePlaceholder: "Enter date",
      valueLabels: [
          { label: 'Date from', placeholder: 'Enter date from' },
          { label: 'Date to', placeholder: 'Enter date to' },
      ],
      formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
          const dateVal = moment(val, wgtDef.valueFormat);
          return isForDisplay ? '"' + dateVal.format(wgtDef.dateFormat) + '"' : JSON.stringify(val);
      },
      sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
          const dateVal = moment(val, wgtDef.valueFormat);
          return SqlString.escape(dateVal.format('YYYY-MM-DD'));
      },
  },
  time: {
      type: "time",
      valueSrc: 'value',
      factory: (props) => <TimeWidget {...props} />,
      timeFormat: 'HH:mm',
      valueFormat: 'HH:mm:ss',
      valueLabel: "Time",
      valuePlaceholder: "Enter time",
      valueLabels: [
          { label: 'Time from', placeholder: 'Enter time from' },
          { label: 'Time to', placeholder: 'Enter time to' },
      ],
      formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
          const dateVal = moment(val, wgtDef.valueFormat);
          return isForDisplay ? '"' + dateVal.format(wgtDef.timeFormat) + '"' : JSON.stringify(val);
      },
      sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
          const dateVal = moment(val, wgtDef.valueFormat);
          return SqlString.escape(dateVal.format('HH:mm:ss'));
      },
  },
  datetime: {
      type: "datetime",
      valueSrc: 'value',
      factory: (props) => <DateTimeWidget {...props} />,
      timeFormat: 'HH:mm',
      dateFormat: 'DD.MM.YYYY',
      valueFormat: 'YYYY-MM-DD HH:mm:ss',
      valueLabel: "Datetime",
      valuePlaceholder: "Enter datetime",
      valueLabels: [
          { label: 'Datetime from', placeholder: 'Enter datetime from' },
          { label: 'Datetime to', placeholder: 'Enter datetime to' },
      ],
      formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
          const dateVal = moment(val, wgtDef.valueFormat);
          return isForDisplay ? '"' + dateVal.format(wgtDef.dateFormat + ' ' + wgtDef.timeFormat) + '"' : JSON.stringify(val);
      },
      sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
          const dateVal = moment(val, wgtDef.valueFormat);
          return SqlString.escape(dateVal.toDate());
      },
  },
  boolean: {
      type: "boolean",
      valueSrc: 'value',
      factory: (props) => <BooleanWidget {...props} />,
      labelYes: "Yes",
      labelNo: "No",
      formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
          return isForDisplay ? (val ? "Yes" : "No") : JSON.stringify(!!val);
      },
      sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
          return SqlString.escape(val);
      },
      defaultValue: false,
  },
  field: {
      valueSrc: 'field',
      factory: (props) => <ValueFieldWidget {...props} />,
      formatValue: (val, fieldDef, wgtDef, isForDisplay, valFieldDef) => {
          return isForDisplay ? (valFieldDef.label || val) : val;
      },
      sqlFormatValue: (val, fieldDef, wgtDef, valFieldDef, op, opDef) => {
          return val;
      },
      valueLabel: "Field to compare",
      valuePlaceholder: "Select field to compare",
      customProps: {
          showSearch: true
      }
  }
};

//----------------------------  types

const types = {
  text: {
      defaultOperator: 'equal',
      widgets: {
          text: {
              operators: [
                  'equal',
                  'not_equal',
                  'is_empty',
                  'is_not_empty',
                  'like',
                  'not_like',
                  'proximity'
              ],
              widgetProps: {},
              opProps: {},
          },
          field: {
              operators: [
                  //unary ops (like `is_empty`) will be excluded anyway, see getWidgetsForFieldOp()
                  'equal',
                  'not_equal',
                  'proximity', //can exclude if you want
              ],
          }
      },
  },
  number: {
      defaultOperator: 'equal',
      mainWidget: 'number',
      widgets: {
          number: {
              operators: [
                  "equal",
                  "not_equal",
                  "less",
                  "less_or_equal",
                  "greater",
                  "greater_or_equal",
                  "between",
                  "not_between",
                  "is_empty",
                  "is_not_empty",
              ],
          },
          slider: {
              operators: [
                  "equal",
                  "not_equal",
                  "less",
                  "less_or_equal",
                  "greater",
                  "greater_or_equal",
                  "is_empty",
                  "is_not_empty",
              ],
          },
          rangeslider: {
              operators: [
                  "range_between",
                  "range_not_between",
                  "is_empty",
                  "is_not_empty",
              ],
          }
      },
  },
  date: {
      defaultOperator: 'equal',
      widgets: {
          date: {
              operators: [
                  "equal",
                  "not_equal",
                  "less",
                  "less_or_equal",
                  "greater",
                  "greater_or_equal",
                  "between",
                  "not_between",
                  "is_empty",
                  "is_not_empty",
              ]
          }
      },
  },
  time: {
      defaultOperator: 'equal',
      widgets: {
          time: {
              operators: [
                  "equal",
                  "not_equal",
                  "less",
                  "less_or_equal",
                  "greater",
                  "greater_or_equal",
                  "between",
                  "not_between",
                  "is_empty",
                  "is_not_empty",
              ]
          }
      },
  },
  datetime: {
     defaultOperator: 'equal',
      widgets: {
          datetime: {
              operators: [
                  "equal",
                  "not_equal",
                  "less",
                  "less_or_equal",
                  "greater",
                  "greater_or_equal",
                  "between",
                  "not_between",
                  "is_empty",
                  "is_not_empty",
              ],
          }
      },
  },
  select: {
      mainWidget: "select",
      defaultOperator: 'select_equals',
      widgets: {
          select: {
              operators: [
                  'select_equals',
                  'select_not_equals'
              ],
              widgetProps: {
                  customProps: {
                      showSearch: true
                  }
              },
          },
          multiselect: {
              operators: [
                  'select_any_in',
                  'select_not_any_in'
              ],
          },
      },
  },
  multiselect: {
      defaultOperator: 'multiselect_equals',
      widgets: {
          multiselect: {
              operators: [
                  'multiselect_equals',
                  'multiselect_not_equals',
              ]
          }
      },
  },
  boolean: {
      defaultOperator: 'equal',
      widgets: {
          boolean: {
              operators: [
                  "equal",
                  "not_equal",
              ],
              widgetProps: {
                  //you can enable this if you don't use fields as value sources
                  // hideOperator: true,
                  // operatorInlineLabel: "is",
              }
          },
          field: {
              operators: [
                  "equal",
                  "not_equal",
              ],
          }
      },
  },
};

//----------------------------  settings

const settings = {
  ...defaultSettings,

  formatField: (field, parts, label2, fieldDefinition, config, isForDisplay) => {
      if (isForDisplay)
          return label2;
      else
          return field;
  },
  sqlFormatReverse: (q, operator, reversedOp, operatorDefinition, revOperatorDefinition) => {
    if (q == undefined) return undefined;
    return "NOT(" + q + ")";
  },
  formatReverse: (q, operator, reversedOp, operatorDefinition, revOperatorDefinition, isForDisplay) => {
    if (q == undefined) return undefined;
    if (isForDisplay)
        return "NOT(" + q + ")";
    else
        return "!(" + q + ")";
  },
  canCompareFieldWithField: (leftField, leftFieldConfig, rightField, rightFieldConfig) => {
      //for type == 'select'/'multiselect' you can check listValues
      return true;
  },

  // enable compare fields
  valueSourcesInfo: {
      value: {
          label: "Value"
      },
      field: {
          label: "Field",
          widget: "field",
      }
  },
  customFieldSelectProps: {
      showSearch: true
  },
};

//----------------------------

export default {
  conjunctions,
  operators,
  widgets,
  types,
  settings,
};
