module.exports = function swap (obj) {
	const tmp = obj[1];
	obj[1] = obj[0];
	obj[0] = tmp;
	return obj;
};
