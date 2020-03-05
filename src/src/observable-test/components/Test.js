import React from 'react';

class ObservableCell extends React.Component {
  getRef (ref) {
    console.log('maybe got ref?');
    console.log(ref);
  }

  render () {
    console.log('hit');
    return (
      <div ref={this.getRef.bind(this)}>
        Hello!
      </div>
    );
  }
}

export default ObservableCell;
