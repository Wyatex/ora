import mimicFunction from "./mimic-function";

const calledFunctions = new WeakMap();

export type Options = {
  /**
	Throw an error when called more than once.

	@default false
	*/
  readonly throw?: boolean;
};

const onetime = <ArgumentsType extends unknown[], ReturnType>(
  fn: (...arguments_: ArgumentsType) => ReturnType,
  options: Options = {}
): ((...arguments_: ArgumentsType) => ReturnType) => {
  let _fn: ((...arguments_: ArgumentsType) => ReturnType) | undefined = fn;
  if (typeof fn !== "function") {
    throw new TypeError("Expected a function");
  }

  let returnValue: ReturnType;
  let callCount = 0;
  const functionName = _fn.name || "<anonymous>";

  const onetime = function (this: any, ...arguments_: ArgumentsType) {
    calledFunctions.set(onetime, ++callCount);

    if (callCount === 1) {
      returnValue = _fn!.apply(this, arguments_);
      _fn = undefined;
    } else if (options.throw === true) {
      throw new Error(`Function \`${functionName}\` can only be called once`);
    }

    return returnValue;
  };

  mimicFunction(onetime, _fn);
  calledFunctions.set(onetime, callCount);

  return onetime;
};

onetime.callCount = <ArgumentsType extends unknown[], ReturnType>(fn: (...arguments_: ArgumentsType) => ReturnType) => {
  if (!calledFunctions.has(fn)) {
    throw new Error(
      `The given function \`${fn.name}\` is not wrapped by the \`onetime\` package`
    );
  }

  return calledFunctions.get(fn);
};

export default onetime;
