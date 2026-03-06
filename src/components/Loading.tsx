import styled from 'styled-components';

const Loader = () => {
    return (
        <StyledWrapper>
            <span className="loader" />
        </StyledWrapper>
    );
}

const StyledWrapper = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  .loader {
    width: 48px;
    height: 48px;
    display: block;
    margin: 15px auto;
    position: relative;
    color: #e8e8f4;
    box-sizing: border-box;
    animation: rotation_19 1s linear infinite;
  }

  .loader::after,
  .loader::before {
    content: '';
    box-sizing: border-box;
    position: absolute;
    width: 24px;
    height: 24px;
    top: 0;
    background-color: #e8e8f4;
    border-radius: 50%;
    animation: scale50 1s infinite ease-in-out;
  }

  .loader::before {
    top: auto;
    bottom: 0;
    background-color: #6366f1;
    animation-delay: 0.5s;
  }

  @keyframes rotation_19 {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes scale50 {
    0%, 100% {
      transform: scale(0);
    }

    50% {
      transform: scale(1);
    }
  }`;

export default Loader;
