// this is a listerner 
// it needs to search for new events on VAULT_B
//it searches for deposit events on vault b , it then needs to call and supply variables to the vault controller
//after it issues the loan from vault A to account B i want it to also listern to events on VAULT_A
// when it finds an event for repaying back the loan i want the event listerner to then call the _withdraw function on VAULT_B
