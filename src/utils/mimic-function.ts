// fork: https://github.com/sindresorhus/mimic-function
// 当您将一个函数包装在另一个函数中并且希望保留原始名称和其他属性时非常有用。

const copyProperty = <
ArgumentsType extends unknown[],
ReturnType,
FunctionType extends (...arguments_: ArgumentsType) => ReturnType,
>(to: (...arguments_: ArgumentsType) => ReturnType, from: FunctionType, property: string | symbol, ignoreNonConfigurable: boolean) => {
	// `Function#length` should reflect the parameters of `to` not `from` since we keep its body.
    // `Function#length` 应该反映 `to` 的参数，而不是 `from` ，因为我们保留了它的主体。
	// `Function#prototype` is non-writable and non-configurable so can never be modified.
    // `Function#prototype` 是不可写和不可配置的，因此永远不能修改。
	if (property === 'length' || property === 'prototype') {
		return;
	}

	// `Function#arguments` and `Function#caller` should not be copied. They were reported to be present in `Reflect.ownKeys` for some devices in React Native (#41), so we explicitly ignore them here.
    // `Function#arguments` 和 `Function#caller` 不应该被复制，在React Native (#41)中提到在某些设备中`Reflect.ownKeys`会出现，所以我们在这里显式忽略它们。
	if (property === 'arguments' || property === 'caller') {
		return;
	}

	const toDescriptor = Object.getOwnPropertyDescriptor(to, property);
	const fromDescriptor = Object.getOwnPropertyDescriptor(from, property)!;

	if (!canCopyProperty(toDescriptor, fromDescriptor) && ignoreNonConfigurable) {
		return;
	}

	Object.defineProperty(to, property, fromDescriptor);
};

// `Object.defineProperty()` throws if the property exists, is not configurable and either:
// - one its descriptors is changed
// - it is non-writable and its value is changed
// `Object.defineProperty()`抛出，如果属性存在，则不可配置
// - 其中一个描述符发生了变化
// - 它不是可写的并且它的值被更改
const canCopyProperty = function (toDescriptor: PropertyDescriptor | undefined, fromDescriptor: PropertyDescriptor) {
	return toDescriptor === undefined || toDescriptor.configurable || (
		toDescriptor.writable === fromDescriptor.writable
		&& toDescriptor.enumerable === fromDescriptor.enumerable
		&& toDescriptor.configurable === fromDescriptor.configurable
		&& (toDescriptor.writable || toDescriptor.value === fromDescriptor.value)
	);
};

const changePrototype = <
ArgumentsType extends unknown[],
ReturnType,
FunctionType extends (...arguments_: ArgumentsType) => ReturnType,
>(to: (...arguments_: ArgumentsType) => ReturnType, from: FunctionType) => {
	const fromPrototype = Object.getPrototypeOf(from);
	if (fromPrototype === Object.getPrototypeOf(to)) {
		return;
	}

	Object.setPrototypeOf(to, fromPrototype);
};

const wrappedToString = (withName: string, fromBody: string) => `/* Wrapped ${withName}*/\n${fromBody}`;

const toStringDescriptor = Object.getOwnPropertyDescriptor(Function.prototype, 'toString')!;
const toStringName = Object.getOwnPropertyDescriptor(Function.prototype.toString, 'name')!;

// We call `from.toString()` early (not lazily) to ensure `from` can be garbage collected.
// 我们提前(不是延迟)调用 `from.toString()` 来确保 `from` 可以被垃圾收集。
// We use `bind()` instead of a closure for the same reason.
// 我们使用 `bind()` 而不是闭包，因为这是相同的原因。
// Calling `from.toString()` early also allows caching it in case `to.toString()` is called several times.
// 调用 `from.toString()` 提前，也允许在 `to.toString()` 被调用几次的情况下缓存它。
const changeToString = <
ArgumentsType extends unknown[],
ReturnType,
FunctionType extends (...arguments_: ArgumentsType) => ReturnType,
>(to: (...arguments_: ArgumentsType) => ReturnType, from: FunctionType, name: string) => {
	const withName = name === '' ? '' : `with ${name.trim()}() `;
	const newToString = wrappedToString.bind(undefined, withName, from.toString());
	// Ensure `to.toString.toString` is non-enumerable and has the same `same`
    // 确保 `to.toString.toString` 不可枚举且具有相同的 `same`
	Object.defineProperty(newToString, 'name', toStringName);
	const {writable, enumerable, configurable} = toStringDescriptor; // We destructure to avoid a potential `get` descriptor. // 我们解构以避免一个可能的 `get` 描述符。
	Object.defineProperty(to, 'toString', {
		value: newToString,
		writable,
		enumerable,
		configurable,
	});
};

export type MimicFunctionOptions = {
	/**
	Skip modifying [non-configurable properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor#Description) instead of throwing an error.

	@default false
	*/
	readonly ignoreNonConfigurable?: boolean;
};

export default function mimicFunction<
ArgumentsType extends unknown[],
ReturnType,
FunctionType extends (...arguments_: ArgumentsType) => ReturnType,
>(to: (...arguments_: ArgumentsType) => ReturnType, from: FunctionType, {ignoreNonConfigurable = false}: MimicFunctionOptions = {}) {
	const {name} = to;

	for (const property of Reflect.ownKeys(from)) {
		copyProperty(to, from, property, ignoreNonConfigurable);
	}

	changePrototype(to, from);
	changeToString(to, from, name);

	return to;
}
