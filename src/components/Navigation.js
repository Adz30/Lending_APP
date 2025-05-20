import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Navbar from "react-bootstrap/Navbar";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Blockies from "react-blockies";

import logo from "../logo.png";

import { loadAccount, loadBalances } from "../store/interactions";
import config from "../config.json";

const Navigation = () => {
  const dispatch = useDispatch();
  const chainId = useSelector((state) => state.provider.chainId);
  const account = useSelector((state) => state.provider.account);
  const tokens = useSelector((state) => state.tokens.contracts);

  const connectHandler = async () => {
    const account = await loadAccount(dispatch);
    await loadBalances(tokens, account, dispatch);
  };

  const networkHandler = async (e) => {
    const selectedChainId = parseInt(e.target.value, 10);
    const hexChainId = `0x${selectedChainId.toString(16)}`;
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
  };

  useEffect(() => {
    const handleChainChanged = () => {
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  return (
    <Navbar className="my-3" expand="lg">
      <img
        alt="logo"
        src={logo}
        width="40"
        height="40"
        className="d-inline-block align-top mx-3"
      />
      <Navbar.Brand href="#">Vault Lending Dapp</Navbar.Brand>

      <Navbar.Toggle aria-controls="nav" />
      <Navbar.Collapse id="nav" className="justify-content-end">
        <div className="d-flex justify-content-end mt-3">
          <Form.Select
            aria-label="Network Selector"
            value={chainId || ""}
            onChange={networkHandler}
            style={{ maxWidth: "200px", marginRight: "20px" }}
          >
            <option value="" disabled>
              Select Network
            </option>
            <option value="31337">Localhost</option>
            <option value="11155111">Sepolia</option>
          </Form.Select>

          {account ? (
            <Navbar.Text className="d-flex align-items-center">
              {account.slice(0, 5) + "..." + account.slice(38, 42)}
              <Blockies
                seed={account}
                size={10}
                scale={3}
                color="#2187D0"
                bgColor="#F1F2F9"
                spotColor="#767F92"
                className="identicon mx-2"
              />
            </Navbar.Text>
          ) : (
            <Button onClick={connectHandler}>Connect</Button>
          )}
        </div>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default Navigation;