import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Spinner from "react-bootstrap/Spinner";
import { ethers } from "ethers";

import Alert from "./Alert";
import {
  depositIntoVaultA,
  loadVaultBalances,
  WithdrawFromVaultA,
  loadVaultShares,
} from "../store/interactions";
import { transform } from "lodash";

const Earn = () => {
  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("");

  const provider = useSelector((state) => state.provider.connection);
  const account = useSelector((state) => state.provider.account);

  const token = useSelector((state) => state.tokens.contracts[0]);
  const symbol = useSelector((state) => state.tokens.symbols[0]);
  const balance = useSelector((state) => state.tokens.balances[0]);

  const VAULT_A = useSelector((state) => state.vaultA.VAULT_A);
  const vaultABalance = useSelector((state) => state.vaultA.vaultABalance);
  const vaultAShare = useSelector((state) => state.vaultA.vaultAShare);

  const VAULT_B = useSelector((state) => state.vaultB.VAULT_B);
  const isDepositing = useSelector(
    (state) => state.vaultA.depositing.isDepositing
  );
  const isWithdrawing = useSelector(
    (state) => state.vaultA.withdrawing.isWithdrawing
  );
  const depositSuccess = useSelector(
    (state) => state.vaultA.depositing.isSuccess
  );
  const withdrawSuccess = useSelector(
    (state) => state.vaultA.withdrawing.isSuccess
  );
  const depositTransactionHash = useSelector(
    (state) => state.vaultA.depositing.transactionHash
  );
  const withdrawTransactionHash = useSelector(
    (state) => state.vaultA.withdrawing.transactionHash
  );

  const dispatch = useDispatch();

  useEffect(() => {
    if (VAULT_A && account) {
      loadVaultShares(VAULT_A, VAULT_B, account, dispatch);
    }
  }, [VAULT_A, VAULT_B, account, dispatch]);

  const depositHandler = async (e) => {
    e.preventDefault();
    setShowAlert(false);

    try {
      const parsedAmount = ethers.utils.parseUnits(
        depositAmount.toString(),
        "ether"
      );
      await depositIntoVaultA(provider, VAULT_A, token, parsedAmount, dispatch);
      
      await loadVaultBalances(VAULT_A, VAULT_B, provider, dispatch);
      await loadVaultShares(VAULT_A, VAULT_B,  account, dispatch);

      setAlertMessage("Deposit Successful");
      setAlertVariant("success");
      setShowAlert(true);
      setDepositAmount(0);
    } catch (error) {

      setAlertMessage("Deposit Failed");
      setAlertVariant("danger");
      setShowAlert(true);
    }
  };

  const withdrawHandler = async (e) => {
    e.preventDefault();
    setShowAlert(false);

    try {
      const parsedAmount = ethers.utils.parseUnits(
        withdrawAmount.toString(),
        "ether"
      );
      await WithdrawFromVaultA(provider, VAULT_A, token,parsedAmount , dispatch);

      await loadVaultBalances(VAULT_A, provider, dispatch);
      await loadVaultShares(VAULT_A, VAULT_B, account, dispatch);

      setAlertMessage("Withdrawal Successful");
      setAlertVariant("success");
      setShowAlert(true);
      setWithdrawAmount(0);
    } catch (error) {
      setAlertMessage("Withdrawal Failed");
      setAlertVariant("danger");
      setShowAlert(true);
    }
  };

  return (
    <Row className="justify-content-center">
      {/* Deposit Card */}
      <Col md={6} className="mb-4">
        <Card>
          <Card.Body>
            <Card.Title>Deposit Assets</Card.Title>
            {account ? (
              <Form onSubmit={depositHandler}>
                <Form.Text
                  className="d-flex justify-content-center align-items-center"
                  muted
                >
                  Fund vault to earn more tokens
                </Form.Text>
                <div className="text-end mb-1 text-muted">
                  Vault Balance: {vaultABalance}&nbsp;{symbol}
                </div>
                <div className="text-end mb-3 text-muted">
                  Your Balance: {balance}&nbsp;{symbol}
                </div>
                <InputGroup className="mb-3">
                  <Form.Control
                    type="number"
                    placeholder="0.0"
                    min="0.0"
                    step="any"
                    value={depositAmount === 0 ? "" : depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                  <InputGroup.Text>{symbol}</InputGroup.Text>
                </InputGroup>
                {isDepositing ? (
                  <Spinner animation="border" className="d-block mx-auto" />
                ) : (
                  <Button type="submit" className="w-100">
                    Deposit
                  </Button>
                )}
              </Form>
            ) : (
              <p className="text-center py-4">Please connect wallet</p>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* Withdraw Card */}
      <Col md={6} className="mb-4">
        <Card>
          <Card.Body>
            <Card.Title>Withdraw Assets</Card.Title>
            {account ? (
              <Form onSubmit={withdrawHandler}>
                <Form.Text
                  className="d-flex justify-content-center align-items-center"
                  muted
                >
                  Convert shares back to assets
                </Form.Text>
                <div className="text-end mb-1 text-muted">
                  Your Shares: {vaultAShare}
                </div>
                <div className="text-end mb-3 text-muted">
                  Vault Balance: {vaultABalance}&nbsp;{symbol}
                </div>
                <InputGroup className="mb-3">
                  <Form.Control
                    type="number"
                    placeholder="0.0"
                    min="0.0"
                    max={vaultAShare}
                    step="any"
                    value={withdrawAmount === 0 ? "" : withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <InputGroup.Text>Shares</InputGroup.Text>
                </InputGroup>
                {isWithdrawing ? (
                  <Spinner animation="border" className="d-block mx-auto" />
                ) : (
                  <Button type="submit" className="w-100">
                    Withdraw
                  </Button>
                )}
              </Form>
            ) : (
              <p className="text-center py-4">Please connect wallet</p>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* Alert Component */}
      {showAlert && (
        <Col md={12}>
          <Alert
            message={alertMessage}
            transactionHash={
              depositSuccess ? depositTransactionHash : withdrawTransactionHash
            }
            variant={alertVariant}
            setShowAlert={setShowAlert}
          />
        </Col>
      )}
    </Row>
  );
};

export default Earn;
