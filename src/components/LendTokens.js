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
import RepayLoan from "./RepayLoan";
import Alert from "./Alert";
import {
  checkLockedStatus,
  depositIntoVaultB,
  loadVaultBalances,
  loadVaultController,
  WithdrawFromVaultB,
  loadVaultShares,
  loadRepaymentAmount
} from "../store/interactions";

const LendTokens = () => {
  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState("success");

  const provider = useSelector((state) => state.provider.connection);
  const account = useSelector((state) => state.provider.account);

  const token = useSelector((state) => state.tokens.contracts[1]);
  const symbol = useSelector((state) => state.tokens.symbols[1]);
  const balance = useSelector((state) => state.tokens.balances[1]);

  const vaultControllerState = useSelector((state) => state.VaultController);

  const locked = useSelector((state) => state.VaultController.locked);

  const VAULT_A = useSelector((state) => state.vaultA.VAULT_A);
  const repaymentAmount = useSelector((state) => state.vaultA.repaymentAmount);
  const VAULT_B = useSelector((state) => state.vaultB.VAULT_B);
  const vaultBBalance = useSelector((state) => state.vaultB.vaultBBalance);
  const vaultBShare = useSelector((state) => state.vaultB.vaultBShare);

  const isDepositing = useSelector((state) => state.vaultB.depositing.isDepositing);
  const depositSuccess = useSelector((state) => state.vaultB.depositing.isSuccess);
  const depositTransactionHash = useSelector((state) => state.vaultB.depositing.transactionHash);

  const isWithdrawing = useSelector((state) => state.vaultB.withdrawing.isWithdrawing);
  const withdrawSuccess = useSelector((state) => state.vaultB.withdrawing.isSuccess);
  const withdrawTransactionHash = useSelector((state) => state.vaultB.withdrawing.transactionHash);

  const dispatch = useDispatch();

  useEffect(() => {
    if (account && provider && vaultControllerState.contract) {
      checkLockedStatus(vaultControllerState, account, dispatch);
    }
  }, [account, provider, vaultControllerState, dispatch]);

  const refreshData = async () => {
    // Refresh vault balances, shares, and locked status
    await loadVaultBalances(VAULT_B, provider, dispatch);
    await loadVaultShares(VAULT_A, VAULT_B, account, dispatch);
    await checkLockedStatus(vaultControllerState, account, dispatch); // Update locked status
  };

  const depositHandler = async (e) => {
    e.preventDefault();
    setShowAlert(false);

    try {
      if (!depositAmount || depositAmount === "0.0") {
        alert("Please enter a valid deposit amount.");
        return;
      }

      const parsedAmount = ethers.utils.parseEther(depositAmount.toString());

      // Execute the deposit
      await depositIntoVaultB(provider, VAULT_B, token, parsedAmount, dispatch);

      // Refresh data after deposit
      await refreshData();

      // Show success alert
      setAlertMessage("Deposit successful!");
      setAlertVariant("success");
      setShowAlert(true);
      setDepositAmount(0);
    } catch (err) {
      console.error("Deposit failed:", err);
      setAlertMessage("Deposit failed.");
      setAlertVariant("danger");
      setShowAlert(true);
    }
  };

  const withdrawHandler = async (e) => {
    e.preventDefault();
    setShowAlert(false);

    try {
      if (!withdrawAmount || withdrawAmount === "0.0") {
        alert("Please enter a valid withdraw amount.");
        return;
      }

      const parsedAmount = ethers.utils.parseEther(withdrawAmount.toString());
      await WithdrawFromVaultB(provider, VAULT_B, token, parsedAmount, dispatch);

      // Refresh data after withdraw
      await refreshData();

      setAlertMessage("Withdrawal successful!");
      setAlertVariant("success");
      setShowAlert(true);
      setWithdrawAmount(0);
    } catch (err) {
      console.error("Withdraw failed:", err);
      setAlertMessage("Withdraw failed.");
      setAlertVariant("danger");
      setShowAlert(true);
    }
  };

  return (
    <>
      <Row className="justify-content-center">
        {/* Deposit Card */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Body>
              <Card.Title className="text-center">Deposit Assets</Card.Title>
              {account ? (
                <Form onSubmit={depositHandler}>
                  <Form.Text
                    className="d-flex justify-content-center align-items-center"
                    muted
                  >
                    Deposit TokenB to get a loan of TokenA worth 90%
                  </Form.Text>
                  <div className="text-end mb-1 text-muted">
                    Vault Balance: {vaultBBalance}&nbsp;{symbol}
                  </div>
                  <div className="text-end mb-1 text-muted">
                    Your Balance: {balance}&nbsp;{symbol}
                  </div>
                  <div className="text-end mb-3 text-muted">
                    Locked Status: {locked ? "Locked 🔒" : "Unlocked 🔓"}
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
              <Card.Title className="text-center">Withdraw Assets</Card.Title>
              {account ? (
                <Form onSubmit={withdrawHandler}>
                  <Form.Text
                    className="d-flex justify-content-center align-items-center"
                    muted
                  >
                    Convert shares back to assets
                  </Form.Text>
                  <div className="text-end mb-1 text-muted">
                    Your Shares: {vaultBShare}
                  </div>
                  <div className="text-end mb-3 text-muted">
                    Vault Balance: {vaultBBalance}&nbsp;{symbol}
                  </div>
                  <InputGroup className="mb-3">
                    <Form.Control
                      type="number"
                      placeholder="0.0"
                      min="0.0"
                      max={vaultBShare}
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
      </Row>

      {/* Repay Loan */}
      <Row className="justify-content-center">
        <Col md={6} lg={4} className="mb-4">
          <Card className="mx-auto" style={{ width: "100%", maxWidth: "800px" }}>
            <Card.Body>
              <Card.Title className="text-center">Repay Loan</Card.Title>
              <RepayLoan refreshData={refreshData} /> {/* Pass refreshData to RepayLoan */}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alert */}
      {showAlert && (
        <Row className="justify-content-center mt-3">
          <Col md={8}>
            <Alert
              message={alertMessage}
              transactionHash={
                depositSuccess ? depositTransactionHash : withdrawTransactionHash
              }
              variant={alertVariant}
              setShowAlert={setShowAlert}
            />
          </Col>
        </Row>
      )}
    </>
  );
};

export default LendTokens;
